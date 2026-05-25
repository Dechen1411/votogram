package postgres

import (
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

var Db *sql.DB

func init() {
	dbInfo, source := connectionString()

	var err error
	Db, err = sql.Open("postgres", dbInfo)
	if err != nil {
		log.Fatalf("failed to open database connection: %v", err)
	}

	log.Printf("database connection configured from %s", source)
}

func connectionString() (string, string) {
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		return withSSLMode(databaseURL, os.Getenv("POSTGRES_SSLMODE")), "DATABASE_URL"
	}

	host := os.Getenv("POSTGRES_HOST")
	port := os.Getenv("POSTGRES_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("POSTGRES_USER")
	password := os.Getenv("POSTGRES_PASSWORD")
	dbname := os.Getenv("POSTGRES_DBNAME")
	sslmode := os.Getenv("POSTGRES_SSLMODE")
	if sslmode == "" {
		sslmode = "require"
		if host == "localhost" || host == "127.0.0.1" {
			sslmode = "disable"
		}
	}

	dbInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode)

	return dbInfo, "POSTGRES_*"
}

func withSSLMode(databaseURL string, sslmode string) string {
	if sslmode == "" || strings.Contains(databaseURL, "sslmode=") {
		return databaseURL
	}

	parsedURL, err := url.Parse(databaseURL)
	if err != nil {
		return databaseURL
	}

	query := parsedURL.Query()
	query.Set("sslmode", sslmode)
	parsedURL.RawQuery = query.Encode()
	return parsedURL.String()
}
