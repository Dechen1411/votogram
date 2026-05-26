package controller

import (
	"net/http"
	"votogram/session"
	"votogram/utils/httpResp"
)

func authenticatedEmail(r *http.Request) (string, bool) {
	sessionObj, err := session.Store.Get(r, "votogram-session")
	if err != nil {
		return "", false
	}

	authenticated, ok := sessionObj.Values["authenticated"].(bool)
	if !ok || !authenticated {
		return "", false
	}

	email, ok := sessionObj.Values["email"].(string)
	if !ok || email == "" {
		return "", false
	}

	return email, true
}

func requirePageAuth(w http.ResponseWriter, r *http.Request) (string, bool) {
	email, ok := authenticatedEmail(r)
	if !ok {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return "", false
	}
	return email, true
}

func requireAuth(w http.ResponseWriter, r *http.Request) (string, bool) {
	email, ok := authenticatedEmail(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return "", false
	}
	return email, true
}

func requireAuthJSON(w http.ResponseWriter, r *http.Request) (string, bool) {
	email, ok := authenticatedEmail(r)
	if !ok {
		httpResp.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return "", false
	}
	return email, true
}
