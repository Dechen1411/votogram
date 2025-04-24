package controller

import (
	"net/http"
	"text/template"
	"votogram/model"
	"votogram/session"
)

func IndexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "templates/index.html")
}

func DashboardHandler(w http.ResponseWriter, r *http.Request) {
	sessionObj, _ := session.Store.Get(r, "votogram-session")
	auth, ok := sessionObj.Values["authenticated"].(bool)
	if !ok || !auth {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse and execute the home.html template
	tmpl, err := template.ParseFiles("templates/home.html")
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	err = tmpl.Execute(w, nil) // Pass data here later if needed
	if err != nil {
		http.Error(w, "Failed to render template", http.StatusInternalServerError)
	}
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "templates/login.html")
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "templates/register.html")
}

func ProfileHandler(w http.ResponseWriter, r *http.Request) {
	sess, _ := session.Store.Get(r, "votogram-session")
	email, ok := sess.Values["email"].(string)
	if !ok || email == "" {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	user := model.User{Email: email}
	if err := user.FindByEmail(email); err != nil {
		http.Error(w, "Unable to load profile", http.StatusInternalServerError)
		return
	}

	tmpl := template.Must(template.ParseFiles("templates/profile.html"))
	data := struct{ User model.User }{user}
	tmpl.Execute(w, data)
}

func ResultsHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "templates/results.html")
}
