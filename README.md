# Votogram

Votogram is a Go web app for creating polls, sharing poll keys, voting, and viewing results after a poll expires. It uses Gorilla Mux for routing, Gorilla Sessions for cookie sessions, PostgreSQL for persistence, and server-rendered HTML templates with static CSS/JS assets.

## Requirements

- Go 1.23 or newer
- PostgreSQL database

## Configuration

Set these environment variables before starting the server:

```powershell
$env:DATABASE_URL="postgresql://postgres:your-password@localhost:5432/votogram"
$env:POSTGRES_HOST="localhost"
$env:POSTGRES_PORT="5432"
$env:POSTGRES_USER="postgres"
$env:POSTGRES_PASSWORD="your-password"
$env:POSTGRES_DBNAME="votogram"
$env:POSTGRES_SSLMODE="disable"
$env:SESSION_SECRET="replace-with-a-long-random-secret"
```

Optional:

```powershell
$env:PORT="8080"
```

`DATABASE_URL` is preferred when available. The separate `POSTGRES_*` values are still supported for local setup.

`SESSION_SECRET` should be a long random value in production. If it is missing, the app uses a development-only fallback and logs a warning.

Use `POSTGRES_SSLMODE="disable"` for a local PostgreSQL server. Hosted databases usually use `require`.

## Database

Create the database tables with:

```powershell
go run . migrate
```

## Run

```powershell
go mod download
go run .
```

Then open:

```text
http://localhost:8080
```

Use the configured `PORT` value if you changed it.

## Deploy To Render

This repo includes `render.yaml`, which defines:

- A native Go web service
- A managed Render Postgres database
- A generated `SESSION_SECRET`
- A pre-deploy migration command: `./votogram migrate`

Deploy flow:

1. Commit and push this repo to GitLab/GitHub.
2. In Render, click **New > Blueprint**.
3. Connect the repo and choose the branch.
4. Render reads `render.yaml`, provisions the web service and database, then runs the migration.

The app will be available at the service's `onrender.com` URL after deploy.

## Deploy To Vercel

This repo includes `api/index.go` and `vercel.json` so Vercel builds the app as a Go function.

```powershell
vercel deploy --prod --yes
```

For production, add these environment variables in the Vercel project settings:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DBNAME`
- `POSTGRES_SSLMODE`
- `SESSION_SECRET`

The database must be hosted somewhere public, such as Neon, Supabase, Railway, Render, or Vercel Postgres. A local PostgreSQL database on `localhost` will not be reachable from Vercel.

## Development Checks

```powershell
gofmt -w .
go test ./...
go vet ./...
git diff --check
```

## Project Structure

- `main.go`: server entrypoint
- `routes/`: HTTP route registration
- `controller/`: page and API handlers
- `model/`: database-backed domain models
- `datastore/postgres/`: PostgreSQL connection setup
- `session/`: cookie session store
- `templates/`: HTML templates
- `static/`: CSS, JavaScript, and runtime-uploaded assets
- `database-q/query.txt`: schema SQL
