package session

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/sessions"
)

var Store = newCookieStore()

func newCookieStore() *sessions.CookieStore {
	secret := os.Getenv("SESSION_SECRET")
	if secret == "" {
		secret = "votogram-dev-session-secret-change-me"
		log.Println("SESSION_SECRET is not set; using development session secret")
	}

	store := sessions.NewCookieStore([]byte(secret))
	store.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 7,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	}
	return store
}
