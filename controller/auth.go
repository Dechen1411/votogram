package controller

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
	"votogram/model"
	"votogram/utils/httpResp"

	"golang.org/x/crypto/bcrypt"
	"votogram/session"
)

func RegisterUser(w http.ResponseWriter, r *http.Request) {
	var user model.User
	decoder := json.NewDecoder(r.Body)

	if err := decoder.Decode(&user); err != nil {
		httpResp.RespondWithError(w, http.StatusBadRequest, "Invalid JSON Body")
		return
	}

	defer r.Body.Close()

	saveErr := user.Create()
	if saveErr != nil {
		log.Printf("Error creating user: %v", saveErr)
		httpResp.RespondWithError(w, http.StatusBadRequest, saveErr.Error())
		return
	}

	httpResp.RespondWithJSON(w, http.StatusCreated, map[string]string{"status": "User Added"})
}

func LoginUser(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		httpResp.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	user := model.User{}
	err := user.FindByEmail(input.Email)
	if err != nil {
		httpResp.RespondWithError(w, http.StatusUnauthorized, "Email not found")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		httpResp.RespondWithError(w, http.StatusUnauthorized, "Incorrect password")
		return
	}

	sessionObj, err := session.Store.Get(r, "votogram-session")
	if err != nil {
		log.Printf("Session error: %v", err)
		httpResp.RespondWithError(w, http.StatusInternalServerError, "Session error")
		return
	}
	sessionObj.Values["authenticated"] = true
	sessionObj.Values["email"] = user.Email
	if err := sessionObj.Save(r, w); err != nil {
		log.Printf("Error saving session: %v", err)
		httpResp.RespondWithError(w, http.StatusInternalServerError, "Failed to save session")
		return
	}

	httpResp.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Login successful"})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	sessionObj, _ := session.Store.Get(r, "votogram-session")
	delete(sessionObj.Values, "authenticated")
	delete(sessionObj.Values, "email")
	sessionObj.Options.MaxAge = -1
	if err := sessionObj.Save(r, w); err != nil {
		log.Printf("Error saving session: %v", err)
		httpResp.RespondWithError(w, http.StatusInternalServerError, "Failed to save session")
		return
	}

	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	email, ok := requireAuthJSON(w, r)
	if !ok {
		return
	}

	var payload struct {
		FullName        string `json:"fullName"`
		Phone           string `json:"phone"`
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
		ConfirmPassword string `json:"confirmPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httpResp.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	user := model.User{Email: email}
	if err := user.FindByEmail(email); err != nil {
		log.Printf("User not found: %v", err)
		httpResp.RespondWithError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Verify current password if provided
	if payload.CurrentPassword != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(payload.CurrentPassword)); err != nil {
			httpResp.RespondWithError(w, http.StatusUnauthorized, "Incorrect current password")
			return
		}
	}

	// Validate new password
	if payload.NewPassword != "" {
		if payload.NewPassword != payload.ConfirmPassword {
			httpResp.RespondWithError(w, http.StatusBadRequest, "New passwords do not match")
			return
		}
		if len(payload.NewPassword) < 8 {
			httpResp.RespondWithError(w, http.StatusBadRequest, "New password must be at least 8 characters")
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(payload.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Error hashing password: %v", err)
			httpResp.RespondWithError(w, http.StatusInternalServerError, "Failed to hash password")
			return
		}
		user.Password = string(hashedPassword)
	} else {
		user.Password = "" // Ensure no password update if not provided
	}

	// Update other fields
	user.FullName = payload.FullName
	user.PhoneNumber = payload.Phone

	if err := user.Update(); err != nil {
		log.Printf("Error updating profile: %v", err)
		httpResp.RespondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to update profile: %s", err.Error()))
		return
	}

	httpResp.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Profile updated successfully"})
}

func UploadAvatarHandler(w http.ResponseWriter, r *http.Request) {
	email, ok := requireAuthJSON(w, r)
	if !ok {
		return
	}

	// Limit file size to 5MB
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		httpResp.RespondWithError(w, http.StatusBadRequest, "Invalid file upload")
		return
	}
	file, handler, err := r.FormFile("avatar")
	if err != nil {
		httpResp.RespondWithError(w, http.StatusBadRequest, "Invalid file upload")
		return
	}
	defer file.Close()

	// Validate file type (only images)
	ext := strings.ToLower(filepath.Ext(handler.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		httpResp.RespondWithError(w, http.StatusBadRequest, "Only JPG and PNG files are allowed")
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "static/uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Printf("Error creating upload directory: %v", err)
		httpResp.RespondWithError(w, http.StatusInternalServerError, "Failed to create upload directory")
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s_%d%s", email, time.Now().UnixNano(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Save file
	dst, err := os.Create(filePath)
	if err != nil {
		log.Printf("Error creating file: %v", err)
		httpResp.RespondWithError(w, http.StatusInternalServerError, "Failed to save file")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		log.Printf("Error saving file: %v", err)
		httpResp.RespondWithError(w, http.StatusInternalServerError, "Failed to save file")
		return
	}

	// Update user's avatar_path in database
	user := model.User{Email: email}
	if err := user.FindByEmail(email); err != nil {
		log.Printf("User not found: %v", err)
		httpResp.RespondWithError(w, http.StatusUnauthorized, "User not found")
		return
	}
	user.AvatarPath = "/static/uploads/" + filename
	if err := user.Update(); err != nil {
		log.Printf("Error updating avatar: %v", err)
		httpResp.RespondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to update avatar: %s", err.Error()))
		return
	}

	httpResp.RespondWithJSON(w, http.StatusOK, map[string]string{
		"message":    "Avatar uploaded successfully",
		"avatarPath": user.AvatarPath,
	})
}
