package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"votogram/datastore/postgres"
	"votogram/routes" // Update to your actual module name if different
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		if err := postgres.ApplyMigrations(); err != nil {
			log.Fatalf("failed to apply migrations: %v", err)
		}
		log.Println("database migrations applied")
		return
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Fallback port for local development
	}

	router := routes.RegisterRoutes()

	fmt.Printf("Server running at http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
