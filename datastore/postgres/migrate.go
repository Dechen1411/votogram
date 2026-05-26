package postgres

var migrationStatements = []string{
	`CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		full_name VARCHAR(100),
		phone_number VARCHAR(20),
		email VARCHAR(255) NOT NULL UNIQUE,
		password VARCHAR(255) NOT NULL,
		avatar_path TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	)`,
	`ALTER TABLE users ALTER COLUMN avatar_path TYPE TEXT`,
	`CREATE TABLE IF NOT EXISTS polls (
		id SERIAL PRIMARY KEY,
		creator_email VARCHAR(255) NOT NULL,
		title VARCHAR(255) NOT NULL,
		expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
		poll_key VARCHAR(6) NOT NULL UNIQUE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (creator_email) REFERENCES users(email) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS poll_options (
		id SERIAL PRIMARY KEY,
		poll_id INTEGER NOT NULL,
		option_text VARCHAR(255) NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS votes (
		id SERIAL PRIMARY KEY,
		poll_id INTEGER NOT NULL,
		option_id INTEGER NOT NULL,
		voter_email VARCHAR(255) NOT NULL,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
		FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
		FOREIGN KEY (voter_email) REFERENCES users(email) ON DELETE CASCADE,
		UNIQUE (poll_id, voter_email)
	)`,
}

func ApplyMigrations() error {
	for _, statement := range migrationStatements {
		if _, err := Db.Exec(statement); err != nil {
			return err
		}
	}
	return nil
}
