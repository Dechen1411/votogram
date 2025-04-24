package main

import (
	"fmt"
	"log"
	"net/http"

	"votogram/routes" // Replace with your actual module name
)

func main() {
	router := routes.RegisterRoutes()

	fmt.Println("Server running at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
