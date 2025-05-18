package controller

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"text/template"
	"time"
	"votogram/datastore/postgres"
	"votogram/session"

	"github.com/gorilla/mux"
)

func GeneratePollKey() (string, error) {
	b := make([]byte, 4) // 4 bytes = 6 base64 characters
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}

	key := base64.URLEncoding.EncodeToString(b)
	key = strings.ToUpper(strings.TrimRight(key, "=")) // Clean key
	return key, nil
}

func CreatePollHandler(w http.ResponseWriter, r *http.Request) {
	sessionObj, _ := session.Store.Get(r, "votogram-session")
	email, ok := sessionObj.Values["email"].(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Title   string   `json:"title"`
		Options []string `json:"options"`
		Expiry  string   `json:"expiry"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Parse expiry time as UTC
	expiryTime, err := time.Parse("2006-01-02T15:04", req.Expiry)
	if err != nil {
		http.Error(w, "Invalid expiry format", http.StatusBadRequest)
		return
	}
	// Ensure the time is in UTC
	expiryTime = expiryTime.UTC()

	// Generate a unique poll key
	var pollKey string
	for {
		pollKey, err = GeneratePollKey()
		if err != nil {
			http.Error(w, "Failed to generate poll key", http.StatusInternalServerError)
			return
		}

		var exists bool
		err = postgres.Db.QueryRow(`SELECT EXISTS(SELECT 1 FROM polls WHERE poll_key = $1)`, pollKey).Scan(&exists)
		if err != nil {
			http.Error(w, "DB error", http.StatusInternalServerError)
			return
		}
		if !exists {
			break
		}
	}

	tx, err := postgres.Db.Begin()
	if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	var pollID int
	err = tx.QueryRow(`INSERT INTO polls (creator_email, title, expires_at, poll_key) VALUES ($1, $2, $3, $4) RETURNING id`,
		email, req.Title, expiryTime, pollKey).Scan(&pollID)
	if err != nil {
		tx.Rollback()
		http.Error(w, "Failed to insert poll", http.StatusInternalServerError)
		return
	}

	for _, opt := range req.Options {
		_, err := tx.Exec(`INSERT INTO poll_options (poll_id, option_text) VALUES ($1, $2)`, pollID, opt)
		if err != nil {
			tx.Rollback()
			http.Error(w, "Failed to insert options", http.StatusInternalServerError)
			return
		}
	}

	tx.Commit()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"poll_key": pollKey})
}

func JoinPollHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PollKey string `json:"poll_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		log.Println("Failed to decode request body:", err)
		return
	}

	var pollID int
	err := postgres.Db.QueryRow(`SELECT id FROM polls WHERE poll_key = $1 AND expires_at > NOW()`, req.PollKey).Scan(&pollID)
	if err != nil {
		log.Println("Poll not found or expired:", err)
		http.Error(w, "Poll not found or expired", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"poll_id": pollID})
}

func VoteHandler(w http.ResponseWriter, r *http.Request) {
	pollID := r.URL.Query().Get("id")
	if pollID == "" {
		http.Error(w, "Poll ID required", http.StatusBadRequest)
		return
	}

	// Check if poll exists and get details
	var title string
	var expiresAt time.Time
	err := postgres.Db.QueryRow(`
        SELECT title, expires_at 
        FROM polls 
        WHERE id = $1 AND expires_at > NOW()`, pollID).Scan(&title, &expiresAt)
	if err != nil {
		http.Error(w, "Poll not found or expired", http.StatusNotFound)
		return
	}

	// Get options for this poll
	rows, err := postgres.Db.Query(`
        SELECT id, option_text 
        FROM poll_options 
        WHERE poll_id = $1`, pollID)
	if err != nil {
		http.Error(w, "Failed to get poll options", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Option struct {
		ID   int    `json:"id"`
		Text string `json:"text"`
	}
	var options []Option

	for rows.Next() {
		var opt Option
		if err := rows.Scan(&opt.ID, &opt.Text); err != nil {
			http.Error(w, "Failed to scan options", http.StatusInternalServerError)
			return
		}
		options = append(options, opt)
	}

	// Render the voting page with poll data
	data := struct {
		Title     string
		ExpiresAt string
		Options   []Option
		PollID    string
	}{
		Title:     title,
		ExpiresAt: expiresAt.Format("January 2, 2006 15:04"),
		Options:   options,
		PollID:    pollID,
	}

	tmpl, err := template.ParseFiles("templates/vote.html")
	if err != nil {
		log.Fatal("Error parsing template: ", err)
	}
	err = tmpl.Execute(w, data)
	if err != nil {
		log.Fatal("Error executing template: ", err)
	}

}

func SubmitVoteHandler(w http.ResponseWriter, r *http.Request) {
	sessionObj, _ := session.Store.Get(r, "votogram-session")
	email, ok := sessionObj.Values["email"].(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		PollID   int `json:"poll_id"`
		OptionID int `json:"option_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Failed to decode vote request:", err)
		// Return JSON error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "error",
			"message": "Invalid request",
		})
		return
	}

	// Check if user already voted
	var alreadyVoted bool
	err := postgres.Db.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM votes 
            WHERE poll_id = $1 AND voter_email = $2
        )`, req.PollID, email).Scan(&alreadyVoted)
	if err != nil {
		// Return JSON error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "error",
			"message": "DB error",
		})
		return
	}
	if alreadyVoted {
		// Return JSON error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "error",
			"message": "You have already voted in this poll",
		})
		return
	}

	// Check if option belongs to poll
	var validOption bool
	err = postgres.Db.QueryRow(`
        SELECT EXISTS(
            SELECT 1 FROM poll_options 
            WHERE id = $1 AND poll_id = $2
        )`, req.OptionID, req.PollID).Scan(&validOption)
	if err != nil || !validOption {
		// Return JSON error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "error",
			"message": "Invalid option for this poll",
		})
		return
	}

	// Record the vote
	_, err = postgres.Db.Exec(`
        INSERT INTO votes (poll_id, option_id, voter_email)
        VALUES ($1, $2, $3)`, req.PollID, req.OptionID, email)
	if err != nil {
		// Return JSON error response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "error",
			"message": "Failed to record vote",
		})
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"message": "Vote recorded successfully",
	})
}

// Add this handler to the controller file

func PollDetailsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pollID := vars["pollID"]

	var title string
	var expiresAt time.Time
	err := postgres.Db.QueryRow(`
        SELECT title, expires_at 
        FROM polls 
        WHERE id = $1 AND expires_at > NOW()`, pollID).Scan(&title, &expiresAt)
	if err != nil {
		http.Error(w, "Poll not found or expired", http.StatusNotFound)
		return
	}

	rows, err := postgres.Db.Query(`
        SELECT id, option_text 
        FROM poll_options 
        WHERE poll_id = $1`, pollID)
	if err != nil {
		http.Error(w, "Failed to get poll options", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var options []struct {
		ID   int    `json:"id"`
		Text string `json:"text"`
	}

	for rows.Next() {
		var opt struct {
			ID   int    `json:"id"`
			Text string `json:"text"`
		}
		if err := rows.Scan(&opt.ID, &opt.Text); err != nil {
			http.Error(w, "Failed to scan options", http.StatusInternalServerError)
			return
		}
		options = append(options, opt)
	}

	response := struct {
		Title     string `json:"title"`
		ExpiresAt string `json:"expires_at"`
		Options   []struct {
			ID   int    `json:"id"`
			Text string `json:"text"`
		} `json:"options"`
	}{
		Title:     title,
		ExpiresAt: expiresAt.UTC().Format("2006-01-02T15:04:05Z"), // ISO format
		Options:   options,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// user.go
// Add this new handler after other handlers

func PollResultsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	pollID := vars["pollID"]

	// Check if poll exists and get details
	var title string
	var expiresAt time.Time
	err := postgres.Db.QueryRow(`
        SELECT title, expires_at 
        FROM polls 
        WHERE id = $1`, pollID).Scan(&title, &expiresAt)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "error",
			"message": "Poll not found",
		})
		return
	}

	// Check if poll has expired
	if time.Now().Before(expiresAt) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "error",
			"message": "Poll results are not available until the poll expires",
		})
		return
	}

	// Get poll options and their vote counts
	rows, err := postgres.Db.Query(`
        SELECT po.id, po.option_text, COUNT(v.option_id) as vote_count
        FROM poll_options po
        LEFT JOIN votes v ON po.id = v.option_id
        WHERE po.poll_id = $1
        GROUP BY po.id, po.option_text`, pollID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "error",
			"message": "Failed to get poll results",
		})
		return
	}
	defer rows.Close()

	type OptionResult struct {
		ID        int    `json:"id"`
		Text      string `json:"text"`
		VoteCount int    `json:"vote_count"`
	}

	var results []OptionResult
	for rows.Next() {
		var result OptionResult
		if err := rows.Scan(&result.ID, &result.Text, &result.VoteCount); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Failed to scan results",
			})
			return
		}
		results = append(results, result)
	}

	// Calculate total votes
	totalVotes := 0
	for _, result := range results {
		totalVotes += result.VoteCount
	}

	response := struct {
		Title      string         `json:"title"`
		ExpiresAt  string         `json:"expires_at"`
		Results    []OptionResult `json:"results"`
		TotalVotes int            `json:"total_votes"`
	}{
		Title:      title,
		ExpiresAt:  expiresAt.Format("January 2, 2006 15:04"),
		Results:    results,
		TotalVotes: totalVotes,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// user.go
// Add this handler after other handlers

func ListExpiredPollsHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("Handling /api/polls/expired request")
	sessionObj, _ := session.Store.Get(r, "votogram-session")
	email, ok := sessionObj.Values["email"].(string)
	if !ok {
		log.Println("Unauthorized: No valid session")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "error",
			"message": "Unauthorized",
		})
		return
	}

	log.Printf("Fetching expired polls for email: %s", email)
	rows, err := postgres.Db.Query(`
        SELECT DISTINCT p.id, p.title, p.expires_at
        FROM polls p
        LEFT JOIN votes v ON p.id = v.poll_id
        WHERE (p.creator_email = $1 OR v.voter_email = $1) AND p.expires_at <= NOW()
        ORDER BY p.expires_at DESC`, email)
	if err != nil {
		log.Printf("Database error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "error",
			"message": "Failed to fetch polls",
		})
		return
	}
	defer rows.Close()

	type Poll struct {
		ID        int    `json:"id"`
		Title     string `json:"title"`
		ExpiresAt string `json:"expires_at"`
	}

	var polls []Poll
	for rows.Next() {
		var poll Poll
		var expiresAt time.Time
		if err := rows.Scan(&poll.ID, &poll.Title, &expiresAt); err != nil {
			log.Printf("Scan error: %v", err)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"status":  "error",
				"message": "Failed to scan polls",
			})
			return
		}
		poll.ExpiresAt = expiresAt.Format("January 2, 2006 15:04")
		polls = append(polls, poll)
	}

	log.Printf("Returning %d expired polls", len(polls))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(polls)
}
