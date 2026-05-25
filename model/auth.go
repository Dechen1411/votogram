package model

import (
	"errors"
	"fmt"
	"strings"
	"votogram/datastore/postgres"

	"golang.org/x/crypto/bcrypt"
)

type User struct {
	FullName    string `json:"full_name"`
	PhoneNumber string `json:"phone_number"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	AvatarPath  string `json:"avatar_path"`
}

const (
	queryInsertUser      = "INSERT INTO users (full_name, phone_number, email, password, avatar_path) VALUES ($1, $2, $3, $4, $5)"
	queryFindUserByEmail = "SELECT full_name, phone_number, email, password, avatar_path FROM users WHERE email=$1"
)

// Create hashes password and inserts a new user
func (u *User) Create() error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = postgres.Db.Exec(queryInsertUser, u.FullName, u.PhoneNumber, u.Email, string(hashedPassword), u.AvatarPath)
	return err
}

// FindByEmail looks up a user by email, filling the struct fields
func (u *User) FindByEmail(email string) error {
	err := postgres.Db.QueryRow(queryFindUserByEmail, email).
		Scan(&u.FullName, &u.PhoneNumber, &u.Email, &u.Password, &u.AvatarPath)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			return errors.New("user not found")
		}
		return err
	}
	return nil
}

// Update writes changed FullName, PhoneNumber, Password, and AvatarPath for existing user
func (u *User) Update() error {
	if u.Email == "" {
		return errors.New("email is required for update")
	}

	// Build dynamic query
	query := "UPDATE users SET"
	args := []interface{}{}
	argIndex := 1
	updates := []string{}

	if u.FullName != "" {
		updates = append(updates, fmt.Sprintf("full_name=$%d", argIndex))
		args = append(args, u.FullName)
		argIndex++
	}
	if u.PhoneNumber != "" {
		updates = append(updates, fmt.Sprintf("phone_number=$%d", argIndex))
		args = append(args, u.PhoneNumber)
		argIndex++
	}
	if u.Password != "" {
		updates = append(updates, fmt.Sprintf("password=$%d", argIndex))
		args = append(args, u.Password)
		argIndex++
	}
	if u.AvatarPath != "" {
		updates = append(updates, fmt.Sprintf("avatar_path=$%d", argIndex))
		args = append(args, u.AvatarPath)
		argIndex++
	}

	if len(updates) == 0 {
		return errors.New("no fields to update")
	}

	query += " " + strings.Join(updates, ", ")
	query += fmt.Sprintf(" WHERE email=$%d", argIndex)
	args = append(args, u.Email)

	result, err := postgres.Db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return errors.New("no user found with the provided email")
	}

	return nil
}
