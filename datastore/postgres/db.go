package postgres

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq" // PostgreSQL driver
)

var Db *sql.DB

func init() {
	// Get DB credentials from environment variables
	host := os.Getenv("POSTGRES_HOST")
	port := os.Getenv("POSTGRES_PORT")
	user := os.Getenv("POSTGRES_USER")
	password := os.Getenv("POSTGRES_PASSWORD")
	dbname := os.Getenv("POSTGRES_DBNAME")

	// Build connection string
	db_info := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=require",
		host, port, user, password, dbname)
	fmt.Println("Connecting to DB with:", db_info)

	var err error
	Db, err = sql.Open("postgres", db_info)
	if err != nil {
		panic(err)
	}
	fmt.Println("Database successfully connected")
}

// package postgres

// import (
// 	"database/sql"
// 	"fmt"
// 	"log"

// 	_ "github.com/lib/pq"
// )

// const (
// 	postgres_host     = "dpg-d0l2rabuibrs739vs7t0-a.singapore-postgres.render.com"
// 	postgres_port     = 5432
// 	postgres_user     = "postgres_admin"
// 	postgres_password = "0qufCFKJ6XpjDqlykrcJU5UU214b21Ww"
// 	postgres_dbname   = "gyalkhor"
// )

// var Db *sql.DB

// func init() {
// 	dbInfo := fmt.Sprintf(
// 		"host=%s port=%d user=%s password=%s dbname=%s sslmode=require",
// 		postgres_host, postgres_port, postgres_user, postgres_password, postgres_dbname,
// 	)

// 	var err error
// 	Db, err = sql.Open("postgres", dbInfo)
// 	if err != nil {
// 		log.Fatalf("Failed to open database connection: %v", err)
// 	}

// 	if err = Db.Ping(); err != nil {
// 		log.Fatalf("Failed to ping database: %v", err)
// 	}

// 	log.Println("✅ Successfully connected to the gyalkhor database")
// }
