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

### 2. Configure environment variables and install the SSL certificates

Copy the template and fill in your values:

```sh
cp .env-template .env
```

We have real commercial SSL certs from 'Sectigo' for wevotedeveloper.com

You can download them from https://drive.google.com/drive/folders/1q0KB2B8HB-AGTMLXrYq7x96McaEJ9_od?usp=drive_link

If you don't have access to this drive, talk to your team leader.

The two files are wevotedeveloper.com_key.txt and wevotedeveloper.com.crt

Copy them to your cert directory  WeVoteServer/cert

Then change your .env file to be

```sh
# .env
DATABASE_USER=postgres
DATABASE_PASSWORD=devpg
HTTPS_SSL_CERT=./cert/wevotedeveloper.com.crt
HTTPS_SSL_KEY=./cert/wevotedeveloper.com_key.txt
```

### 3. Build and start the services

```sh
docker compose up --build
```

This will:
1. Start a PostgreSQL database
2. Wait for the database to be healthy
3. Run `prisma generate` and `prisma migrate deploy` to apply all migrations
4. Start the weconnect-server with nodemon (auto-reloads on file changes)

The API will be available at **https://wevotedeveloper.com:4500/**.

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

You can also see these logs in docker.desktop, and in a terminal (possibly within WebStorm) in which you ran the `docker compose up` command.  

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

## Running and Debugging in WebStorm
* Make sure your WebStorm is updated to the latest version, at least to "WebStorm 2025.2.6.1"
* The WebStorm Docker plugin is bundled with this version and later.

### 1. Connect WebStorm to your Docker Daemon

1) Open settings using **Ctrl + Alt + S* (Windows/Linux) or **Cmd +** , (macOS).
2) Navigate to **Build, Execution, Deployment | Docker**.
3) Click the **+** icon to add a Docker server.   (This is what it looks like on macOS)

<img src="./docs/images/WebStormDockerForMacSetup.png" alt="PyCharm Docker plugin" width="900" style="padding-left: 5%">

4) Press **Ok** to save the docker server connection.

### 2. Create an "Attach to Node" Run Configuration

1) Go to the main menu and select **Run | Edit Configurations**.
2) Click the **+ (Add New Configuration)** button and select **Attach to Node.js/Chrome**.
3) Name the run configuration something like `Attach to Docker API`
3) Host needs to be `localhost`
4) Port needs to be `9229`
5) DO NOT CHECK "Reconnect automatically"  
4) Setup a Remote URLs of local files, Press the **+** to open a blank URL mapping line.
5) A file selection dialog will appear.  Select the `weconnect-server.js` file.  (Leave the default `http://localhost:9229` Remote URL as is.)
5) Click **OK** to save the configuration
6) Start the Docker setup with the `docker compose up` command in a terminal.
6) Once the `Container weconnect-server-weconnect-db-1` starts up, you can press the Debug "bug" icon, in Webstorm for the "Attach to Docker API", and you will be debugging.  Set a breakpoint, run your API call and execution should stop at the breakpoint.
<img src="./docs/images/DockerAttachNodeForDocker.png" alt="PyCharm Docker plugin" width="900" style="padding-left: 1%">


**Note about ephemeral containers:** In Docker.desktop, under `weconnect-server`, you will see the `weconnect-api-1` container and the `weconnect-db-1` container, and while
debugging you may see ephemeral (temporary anonymous) containers like `unruffled_shannon` while debugging -- these 
containers are debugging related and can be ignored.
