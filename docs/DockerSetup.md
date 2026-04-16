# Docker Local Development Setup

This guide explains how to run weconnect-server in a local Docker environment.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin on Linux)
- Git

## Quick Start

### 1. Create the shared Docker network

All WeVote services (WeVoteServer, WebApp, weconnect-server) share a Docker network named `wevote`. Create it once:

```sh
docker network create wevote
```

### 2. Configure environment variables

Copy the template and fill in your values:

```sh
cp .env-template-docker .env
```

If you want to customize the database username and password used by weconnect-server, update the settings in the .env file:

```sh
# .env
DATABASE_USERNAME=your_username_here
DATABASE_PASSWORD=your_password_here
```

The Docker Compose file overrides `DATABASE_HOST`, `DATABASE_PORT`, `HTTPS_SSL_CERT`, and `HTTPS_SSL_KEY` automatically, so you do not need to set those in `.env` for Docker.

### 3. Build and start the services

```sh
docker compose up --build
```

This will:
1. Start a PostgreSQL 16 database
2. Wait for the database to be healthy
3. Run `prisma generate` and `prisma migrate deploy` to apply all migrations
4. Start the weconnect-server with nodemon (auto-reloads on file changes)

The API will be available at **https://localhost:4500**.

To run in the background:

```sh
docker compose up --build -d
```

### 4. Stop the services

```sh
docker compose down
```

To also remove the database volume (deletes all data):

```sh
docker compose down -v
```

## Development Workflow

### Live code reloading

The source directory is mounted into the container at `/app`, so edits you make on the host are reflected immediately. `nodemon` watches for changes and restarts the server automatically.

### Running Prisma commands

To run Prisma commands inside the running container:

```sh
# Open a shell in the api container
docker compose exec weconnect-api sh

# Then run Prisma commands
npx prisma studio          # visual database browser at http://localhost:5555
npx prisma migrate dev     # create a new migration
npx prisma db seed         # run seed script (if configured)
```

Or run them directly without opening a shell:

```sh
docker compose exec weconnect-api npx prisma studio
docker compose exec weconnect-api npx prisma migrate dev --name my_migration
```

### Running tests

```sh
docker compose exec weconnect-api npm test
```

### Viewing logs

```sh
docker compose logs -f weconnect-api    # follow api logs
docker compose logs -f weconnect-db     # follow database logs
```

## Troubleshooting

**`docker network create wevote` fails with "already exists"**
The network already exists — this is fine, proceed to the next step.

**Prisma migration fails on startup**
Check that the database settings are correct in `.env`. Run `docker compose logs weconnect-db` to inspect database errors.

**`node_modules` issues or package errors**
Rebuild the image to reinstall dependencies:

```sh
docker compose build --no-cache 
docker compose up
```
