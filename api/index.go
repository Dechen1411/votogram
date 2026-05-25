package handler

import (
	"net/http"
	"strings"

	"votogram/routes"
)

var router = routes.RegisterRoutes()

func Handler(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" && (r.URL.Path == "/api/index" || r.URL.Path == "/api/index.go") {
		path = "/"
	}
	if path != "" {
		request := r.Clone(r.Context())
		url := *r.URL
		if !strings.HasPrefix(path, "/") {
			path = "/" + path
		}
		url.Path = path

		query := url.Query()
		query.Del("path")
		url.RawQuery = query.Encode()
		request.URL = &url
		r = request
	}

	router.ServeHTTP(w, r)
}
