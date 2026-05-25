package model

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strconv"
	"strings"
	"time"
	"votogram/datastore/postgres"
)

type Poll struct {
	ID        int       `json:"id"`
	Creator   string    `json:"creator_email"`
	Title     string    `json:"title"`
	ExpiresAt time.Time `json:"expires_at"`
	PollKey   string    `json:"poll_key"`
	Options   []Option  `json:"options"`
	CreatedAt time.Time `json:"created_at"`
}

type Option struct {
	ID        int    `json:"id"`
	PollID    int    `json:"poll_id"`
	Text      string `json:"text"`
	VoteCount int    `json:"vote_count,omitempty"`
}

type Vote struct {
	PollID     int       `json:"poll_id"`
	OptionID   int       `json:"option_id"`
	VoterEmail string    `json:"voter_email"`
	VotedAt    time.Time `json:"voted_at"`
}

func GetPollByID(pollID string) (*Poll, error) {
	id, err := strconv.Atoi(pollID)
	if err != nil {
		return nil, errors.New("invalid poll ID format")
	}

	var poll Poll
	err = postgres.Db.QueryRow(`
        SELECT id, creator_email, title, expires_at
        FROM polls WHERE id = $1`, id).Scan(
		&poll.ID, &poll.Creator, &poll.Title, &poll.ExpiresAt)
	if err != nil {
		return nil, err
	}

	rows, err := postgres.Db.Query(`
        SELECT id, option_text
        FROM poll_options
        WHERE poll_id = $1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var opt Option
		if err := rows.Scan(&opt.ID, &opt.Text); err != nil {
			return nil, err
		}
		poll.Options = append(poll.Options, opt)
	}

	return &poll, nil
}

func GeneratePollKey() (string, error) {
	b := make([]byte, 4)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	key := base64.URLEncoding.EncodeToString(b)
	return strings.ToUpper(strings.TrimRight(key, "=")), nil
}

func (p *Poll) Create() error {
	tx, err := postgres.Db.Begin()
	if err != nil {
		return err
	}

	// Generate unique poll key
	var pollKey string
	for {
		pollKey, err = GeneratePollKey()
		if err != nil {
			tx.Rollback()
			return err
		}

		var exists bool
		err = tx.QueryRow(`SELECT EXISTS(SELECT 1 FROM polls WHERE poll_key = $1)`, pollKey).Scan(&exists)
		if err != nil {
			tx.Rollback()
			return err
		}
		if !exists {
			break
		}
	}

	err = tx.QueryRow(
		`INSERT INTO polls (creator_email, title, expires_at, poll_key)
		VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
		p.Creator, p.Title, p.ExpiresAt, pollKey,
	).Scan(&p.ID, &p.CreatedAt)
	if err != nil {
		tx.Rollback()
		return err
	}

	for _, opt := range p.Options {
		_, err := tx.Exec(
			`INSERT INTO poll_options (poll_id, option_text)
			VALUES ($1, $2)`,
			p.ID, opt.Text,
		)
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit()
}

func GetPollByKey(pollKey string) (*Poll, error) {
	var poll Poll
	err := postgres.Db.QueryRow(`
		SELECT id, creator_email, title, expires_at, poll_key
		FROM polls WHERE poll_key = $1 AND expires_at > NOW()`,
		pollKey,
	).Scan(&poll.ID, &poll.Creator, &poll.Title, &poll.ExpiresAt, &poll.PollKey)
	if err != nil {
		return nil, err
	}
	return &poll, nil
}

func GetPollDetails(pollID int) (*Poll, error) {
	var poll Poll
	err := postgres.Db.QueryRow(`
		SELECT id, creator_email, title, expires_at
		FROM polls WHERE id = $1`,
		pollID,
	).Scan(&poll.ID, &poll.Creator, &poll.Title, &poll.ExpiresAt)
	if err != nil {
		return nil, err
	}

	rows, err := postgres.Db.Query(`
		SELECT id, option_text
		FROM poll_options
		WHERE poll_id = $1`, pollID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var opt Option
		if err := rows.Scan(&opt.ID, &opt.Text); err != nil {
			return nil, err
		}
		poll.Options = append(poll.Options, opt)
	}

	return &poll, nil
}

func RecordVote(vote *Vote) error {
	// Check if user is the poll creator
	var creatorEmail string
	err := postgres.Db.QueryRow(
		`SELECT creator_email FROM polls WHERE id = $1`,
		vote.PollID,
	).Scan(&creatorEmail)
	if err != nil {
		return err
	}
	if creatorEmail == vote.VoterEmail {
		return errors.New("poll creators cannot vote in their own polls")
	}

	// Check if already voted
	var alreadyVoted bool
	err = postgres.Db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM votes
			WHERE poll_id = $1 AND voter_email = $2
		)`, vote.PollID, vote.VoterEmail).Scan(&alreadyVoted)
	if err != nil {
		return err
	}
	if alreadyVoted {
		return errors.New("already voted in this poll")
	}

	// Check valid option
	var validOption bool
	err = postgres.Db.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM poll_options
			WHERE id = $1 AND poll_id = $2
		)`, vote.OptionID, vote.PollID).Scan(&validOption)
	if err != nil || !validOption {
		return errors.New("invalid option for this poll")
	}

	_, err = postgres.Db.Exec(`
		INSERT INTO votes (poll_id, option_id, voter_email)
		VALUES ($1, $2, $3)`, vote.PollID, vote.OptionID, vote.VoterEmail)
	return err
}

func GetPollResults(pollID string) (*Poll, error) {
	id, err := strconv.Atoi(pollID)
	if err != nil {
		return nil, errors.New("invalid poll ID format")
	}

	poll, err := GetPollByID(pollID)
	if err != nil {
		return nil, err
	}

	rows, err := postgres.Db.Query(`
        SELECT po.id, po.option_text, COUNT(v.option_id) as vote_count
        FROM poll_options po
        LEFT JOIN votes v ON po.id = v.option_id
        WHERE po.poll_id = $1
        GROUP BY po.id, po.option_text`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var options []Option
	var totalVotes int
	for rows.Next() {
		var opt Option
		if err := rows.Scan(&opt.ID, &opt.Text, &opt.VoteCount); err != nil {
			return nil, err
		}
		totalVotes += opt.VoteCount
		options = append(options, opt)
	}

	poll.Options = options
	return poll, nil
}

func GetUserPolls(email string) ([]Poll, error) {
	rows, err := postgres.Db.Query(`
		SELECT id, title, poll_key, expires_at
		FROM polls
		WHERE creator_email = $1
		ORDER BY expires_at DESC`, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var polls []Poll
	for rows.Next() {
		var p Poll
		if err := rows.Scan(&p.ID, &p.Title, &p.PollKey, &p.ExpiresAt); err != nil {
			return nil, err
		}
		polls = append(polls, p)
	}
	return polls, nil
}
