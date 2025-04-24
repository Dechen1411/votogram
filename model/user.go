package model

import (
	"errors"
	"votogram/datastore/postgres"

	"golang.org/x/crypto/bcrypt"
)

type User struct {
	FullName    string `json:"full_name"`
	PhoneNumber string `json:"phone_number"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

const (
	queryInsertUser        = "INSERT INTO users (full_name, phone_number, email, password) VALUES ($1, $2, $3, $4)"
	queryFindUserByEmail   = "SELECT full_name, phone_number, email, password FROM users WHERE email=$1"
	queryUpdateUserProfile = "UPDATE users SET full_name=$1, phone_number=$2 WHERE email=$3"
)

// Create hashes password and inserts a new user
func (u *User) Create() error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = postgres.Db.Exec(queryInsertUser, u.FullName, u.PhoneNumber, u.Email, string(hashedPassword))
	return err
}

// FindByEmail looks up a user by email, filling the struct fields
func (u *User) FindByEmail(email string) error {
	err := postgres.Db.QueryRow(queryFindUserByEmail, email).
		Scan(&u.FullName, &u.PhoneNumber, &u.Email, &u.Password)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			return errors.New("user not found")
		}
		return err
	}
	return nil
}

// Update writes changed FullName and PhoneNumber for existing user
func (u *User) Update() error {
	// ensure user exists
	if err := u.FindByEmail(u.Email); err != nil {
		return err
	}
	_, err := postgres.Db.Exec(queryUpdateUserProfile, u.FullName, u.PhoneNumber, u.Email)
	return err
}
