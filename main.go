package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"votogram/routes" // Update to your actual module name if different
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Fallback port for local development
	}

	router := routes.RegisterRoutes()

	fmt.Printf("Server running at http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
