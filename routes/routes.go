package routes

import (
	"net/http"
	"votogram/controller"

	"github.com/gorilla/mux"
)

func RegisterRoutes() *mux.Router {
	router := mux.NewRouter()

	router.HandleFunc("/", controller.IndexHandler).Methods("GET")
	router.HandleFunc("/home", controller.DashboardHandler).Methods("GET")
	router.HandleFunc("/login", controller.LoginHandler).Methods("GET")
	router.HandleFunc("/login", controller.LoginUser).Methods("POST")
	router.HandleFunc("/register", controller.RegisterHandler).Methods("GET")
	router.HandleFunc("/register", controller.RegisterUser).Methods("POST")
	router.HandleFunc("/profile", controller.ProfileHandler).Methods("GET")
	router.HandleFunc("/results", controller.ResultsHandler).Methods("GET")
	router.HandleFunc("/logout", controller.LogoutHandler).Methods("GET")
	router.HandleFunc("/update-profile", controller.UpdateProfileHandler).Methods("POST")
	router.HandleFunc("/terms", controller.TermsHandler).Methods("GET")
	router.HandleFunc("/privacy", controller.PrivacyHandler).Methods("GET")
	router.HandleFunc("/faq", controller.FaqHandler).Methods("GET")
	router.HandleFunc("/aboutus", controller.AboutUsHandler).Methods("GET")
	router.HandleFunc("/contact", controller.ContactHandler).Methods("GET")

	// Static file serving
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))

	return router
}
