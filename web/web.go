package web

import (
	"embed"
	"io/fs"
	"net/http"
	"text/template"
)

//go:embed templates/* static/css/* static/js/* static/images/*
var files embed.FS

func ParseTemplate(name string) (*template.Template, error) {
	return template.ParseFS(files, "templates/"+name)
}

func ServeTemplate(w http.ResponseWriter, r *http.Request, name string) {
	http.ServeFileFS(w, r, files, "templates/"+name)
}

func StaticHandler() http.Handler {
	staticFS, err := fs.Sub(files, "static")
	if err != nil {
		return http.NotFoundHandler()
	}
	return http.FileServerFS(staticFS)
}
