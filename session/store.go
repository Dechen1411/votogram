package session

import (
	"github.com/gorilla/sessions"
)

var Store = sessions.NewCookieStore([]byte("sangay10")) // 🔐 Use a strong secret key in production!
