package controller

import (
	"encoding/json"
	"net/http"
	"votogram/model"          // your own model package
	"votogram/utils/httpResp" // utility for consistent JSON responses

	"golang.org/x/crypto/bcrypt"

	"votogram/session"
)

func RegisterUser(w http.ResponseWriter, r *http.Request) {
	var user model.User
	decoder := json.NewDecoder(r.Body)

	// store the json object data to stud variable
	if err := decoder.Decode(&user); err != nil {
		httpResp.RespondWithError(w, http.StatusBadRequest, "Invalid json Body")
		return
	}

	// defer the closing of request body until the function returns
	defer r.Body.Close()

	// call the Create() using student object, stud
	saveErr := user.Create()
	if saveErr != nil {
		httpResp.RespondWithError(w, http.StatusBadRequest, saveErr.Error())
		return
	}

	// no error
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

	// Secure bcrypt comparison
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		httpResp.RespondWithError(w, http.StatusUnauthorized, "Incorrect password")
		return
	}

	sessionObj, _ := session.Store.Get(r, "votogram-session")
	sessionObj.Values["authenticated"] = true
	sessionObj.Values["email"] = user.Email // Optional: save other info
	sessionObj.Save(r, w)

	httpResp.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Login successful"})
}

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	sessionObj, _ := session.Store.Get(r, "votogram-session")
	sessionObj.Values["authenticated"] = false
	sessionObj.Options.MaxAge = -1 // deletes the session
	sessionObj.Save(r, w)

	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

// UpdateProfileHandler processes profile update form
func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	sess, _ := session.Store.Get(r, "votogram-session")
	email, ok := sess.Values["email"].(string)
	if !ok {
		httpResp.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var payload struct {
		FullName string `json:"fullName"`
		Phone    string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httpResp.RespondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	user := model.User{FullName: payload.FullName, PhoneNumber: payload.Phone, Email: email}
	if err := user.Update(); err != nil {
		httpResp.RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpResp.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Profile updated successfully"})
}
