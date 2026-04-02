# 🔩 Car Service Timeline

A self-hosted visual timeline for tracking vehicle maintenance history. Built with React + Express + SQLite.

![Stack](https://img.shields.io/badge/React-18-blue) ![Stack](https://img.shields.io/badge/Express-4-green) ![Stack](https://img.shields.io/badge/SQLite-3-orange) ![Stack](https://img.shields.io/badge/Docker-ready-blue)

## Features

- **Visual timeline** — alternating left/right cards, color-coded by category
- **8 categories** — Oil & Fluids, Brakes, Tires, Engine, Electrical, Body, Inspection, Other
- **Search & filter** — full-text search across all fields, category filtering
- **Stats dashboard** — total events, total cost, max mileage
- **Import / Export** — JSON backup and restore
- **SQLite storage** — single file database, easy to back up
- **Docker-ready** — single container, runs anywhere

## Deployment

This project uses **GitHub Actions** to automatically build a Docker image and publish it to GitHub Container Registry (`ghcr.io`) on every push to `main`.

**For a complete step-by-step setup guide (beginner-friendly), see [SETUP-GUIDE.md](SETUP-GUIDE.md).**

### Quick Start (if you know what you're doing)

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/car-service-timeline.git
cd car-service-timeline

# Local development
npm install
npm run dev

# Or run with Docker locally
docker compose up -d
open http://localhost:3100
```

### Deploy on TrueNAS SCALE

Use `docker-compose.truenas.yml` — paste it into TrueNAS Apps → Discover → ⋮ → Install via YAML. See the setup guide for details.

The SQLite database is stored in the mounted volume and persists across container restarts.

## Deploy on TrueNAS SCALE

### Option A: Custom App (Docker Compose)

1. Copy this project to your TrueNAS server (e.g. via SSH or SMB share)
2. SSH into TrueNAS
3. Navigate to the project directory
4. Run:
   ```bash
   docker compose up -d
   ```
5. Access at `http://<truenas-ip>:3100`

### Option B: TrueNAS Apps UI

1. Build the Docker image and push to a registry:
   ```bash
   docker build -t your-registry/car-timeline:latest .
   docker push your-registry/car-timeline:latest
   ```
2. In TrueNAS SCALE → Apps → Launch Docker Image
3. Set:
   - **Image**: `your-registry/car-timeline:latest`
   - **Port**: 3100 → 3000
   - **Storage**: Mount a host path to `/app/data`

## Local Development (without Docker)

```bash
# Install dependencies
npm install

# Run both API and frontend in dev mode
npm run dev

# API runs on :3000, frontend on :5173 (with proxy)
```

## API Endpoints

| Method   | Path              | Description             |
|----------|-------------------|-------------------------|
| `GET`    | `/api/events`     | List events (query: `q`, `category`) |
| `GET`    | `/api/events/:id` | Get single event        |
| `POST`   | `/api/events`     | Create event            |
| `PUT`    | `/api/events/:id` | Update event            |
| `DELETE` | `/api/events/:id` | Delete event            |
| `GET`    | `/api/stats`      | Get summary stats       |
| `GET`    | `/api/export`     | Export all as JSON       |
| `POST`   | `/api/import`     | Import JSON array        |

## Backup

Your entire database is a single file at `./data/timeline.db`. To back up:

```bash
cp data/timeline.db data/timeline-backup-$(date +%Y%m%d).db
```

Or use the in-app **Export** button to download a JSON backup.

## Project Structure

```
car-timeline/
├── server/
│   └── index.js          # Express API + SQLite
├── src/
│   ├── main.jsx          # React entry point
│   ├── App.jsx           # Main app component
│   └── api.js            # API client helper
├── index.html            # Vite entry
├── vite.config.js        # Vite + dev proxy
├── Dockerfile            # Multi-stage build
├── docker-compose.yml    # One-command deploy
└── data/
    └── timeline.db       # SQLite database (created on first run)
```
