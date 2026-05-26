package controller

import (
	"log"
	"net/http"
	"votogram/model"
	"votogram/web"
)

func IndexHandler(w http.ResponseWriter, r *http.Request) {
	web.ServeTemplate(w, r, "index.html")
}

func DashboardHandler(w http.ResponseWriter, r *http.Request) {
	if _, ok := requirePageAuth(w, r); !ok {
		return
	}

	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	// Parse and execute the home.html template
	tmpl, err := web.ParseTemplate("home.html")
	if err != nil {
		log.Printf("Error parsing home template: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	err = tmpl.Execute(w, nil) // Pass data here later if needed
	if err != nil {
		log.Printf("Error executing home template: %v", err)
		http.Error(w, "Failed to render template", http.StatusInternalServerError)
		return
	}
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	web.ServeTemplate(w, r, "login.html")
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	web.ServeTemplate(w, r, "register.html")
}

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	email, ok := requirePageAuth(w, r)
	if !ok {
		return
	}

	user := model.User{Email: email}
	if err := user.FindByEmail(email); err != nil {
		http.Error(w, "Unable to load profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	tmpl, err := web.ParseTemplate("profile.html")
	if err != nil {
		log.Printf("Error parsing profile template: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	data := struct{ User model.User }{user}
	if err := tmpl.Execute(w, data); err != nil {
		log.Printf("Error executing profile template: %v", err)
		http.Error(w, "Failed to render template", http.StatusInternalServerError)
		return
	}
}

func ResultsHandler(w http.ResponseWriter, r *http.Request) {
	if _, ok := requirePageAuth(w, r); !ok {
		return
	}

	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	web.ServeTemplate(w, r, "results.html")
}

func TermsHandler(w http.ResponseWriter, r *http.Request) {
	web.ServeTemplate(w, r, "terms.html")
}

func PrivacyHandler(w http.ResponseWriter, r *http.Request) {
	web.ServeTemplate(w, r, "privacy.html")
}

func FaqHandler(w http.ResponseWriter, r *http.Request) {
	web.ServeTemplate(w, r, "faq.html")
}

func AboutUsHandler(w http.ResponseWriter, r *http.Request) {
	web.ServeTemplate(w, r, "about.html")
}

func ContactHandler(w http.ResponseWriter, r *http.Request) {
	web.ServeTemplate(w, r, "contactus.html")
}
