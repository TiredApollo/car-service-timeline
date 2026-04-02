# Setup Guide: Car Service Timeline on TrueNAS via GitHub

This guide walks you through the entire process from zero to a running app on your TrueNAS server. No prior experience with GitHub or Docker required.

---

## What we're setting up

```
Your computer                  GitHub                    TrueNAS
    |                            |                          |
    |   1. Upload/edit files     |                          |
    |  ───────────────────────>  |                          |
    |                            |  2. Auto-builds Docker   |
    |                            |     image (via Actions)  |
    |                            |                          |
    |                            |  3. Publishes image to   |
    |                            |     ghcr.io registry     |
    |                            |                          |
    |                            |  4. TrueNAS pulls the    |
    |                            |     image and runs it    |
    |                            |  ──────────────────────> |
    |                            |                          |
    |           5. You open the app in your browser         |
    |  <─────────────────────────────────────────────────── |
```

---

## Part 1: GitHub Setup (one time, ~15 minutes)

### Step 1 — Create a GitHub account

1. Go to https://github.com
2. Click **Sign up**
3. Follow the steps (email, password, username)
4. Verify your email

Remember your username — you'll need it later. It will be part of your image URL.


### Step 2 — Create a new repository

1. Once logged in, click the **+** button in the top-right corner
2. Click **New repository**
3. Fill in:
   - **Repository name**: `car-service-timeline`
   - **Description**: (optional) `Visual maintenance timeline for my car`
   - **Visibility**: Choose **Public** (free GitHub Actions + free container registry)
     - If you choose Private, it still works but you get fewer free Action minutes per month (2,000 instead of unlimited)
   - Check **Add a README file**
4. Click **Create repository**


### Step 3 — Upload the project files

1. On your new repository page, click **Add file** → **Upload files**
2. Drag and drop ALL files from the project folder I gave you:
   ```
   .github/workflows/build.yml    ← this is inside a hidden folder!
   server/index.js
   src/App.jsx
   src/api.js
   src/main.jsx
   .dockerignore
   .gitignore
   Dockerfile
   docker-compose.truenas.yml
   docker-compose.yml
   index.html
   package.json
   vite.config.js
   ```

   **Important**: The `.github` folder is a hidden folder (starts with a dot).
   - On **Windows**: In File Explorer, go to View → Show → Hidden items
   - On **Mac**: In Finder, press `Cmd + Shift + .` to show hidden files

3. At the bottom of the page, type a commit message like `Initial upload`
4. Click **Commit changes**


### Step 4 — Verify the build ran

1. Click the **Actions** tab at the top of your repository page
2. You should see a workflow run called "Build and Publish Docker Image"
3. Click on it — you'll see it go through steps:
   - Checkout code ✓
   - Log in to GitHub Container Registry ✓
   - Build and push Docker image ✓
4. Wait for it to finish (usually takes 1-3 minutes)
5. A green checkmark ✓ means your image is built and ready

If you see a red ✗, something went wrong — check the logs by clicking on the failed step.


### Step 5 — Make the package public (if your repo is public)

The first time an image is published, GitHub sets its visibility to match your repo. But it's good to double-check:

1. Go to your GitHub profile page (click your avatar → Your profile)
2. Click the **Packages** tab
3. You should see `car-service-timeline`
4. Click on it
5. On the right side, click **Package settings**
6. Scroll down to **Danger Zone** and check that visibility is **Public**
   (This allows TrueNAS to pull the image without needing to log in)

Your image URL is now:
```
ghcr.io/YOUR_GITHUB_USERNAME/car-service-timeline:latest
```
(Replace YOUR_GITHUB_USERNAME with your actual GitHub username, in lowercase)

---

## Part 2: TrueNAS Setup (one time, ~10 minutes)

### Step 1 — Create a dataset for the database

1. Open your TrueNAS web UI
2. Go to **Datasets**
3. Select your main pool (e.g., `tank`)
4. Click **Add Dataset**
5. Name it `car-timeline-data`
6. Click **Save**

Note the full path — it will be something like `/mnt/tank/car-timeline-data`


### Step 2 — Install the app via YAML

1. Go to **Apps** in TrueNAS
2. Click **Discover Apps**
3. Click the **⋮** (three dots) next to the "Custom App" button
4. Click **Install via YAML**
5. Give it a name: `car-timeline`
6. In the YAML editor, paste this (replace the TWO placeholders):

```yaml
services:
  car-timeline:
    image: ghcr.io/YOUR_GITHUB_USERNAME/car-service-timeline:latest
    container_name: car-timeline
    ports:
      - "3100:3000"
    volumes:
      - /mnt/tank/car-timeline-data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

**Replace these:**
- `YOUR_GITHUB_USERNAME` → your actual GitHub username (lowercase)
- `/mnt/tank/car-timeline-data` → the actual path from Step 1 (if different)

7. Click **Save**
8. Wait for TrueNAS to pull the image and start the container


### Step 3 — Open the app

Open your browser and go to:
```
http://<your-truenas-ip>:3100
```

You should see the Service Timeline app. Done!

---

## Part 3: Updating the App (whenever you want)

### When I give you updated files

1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/car-service-timeline`
2. Navigate to the file that changed (e.g., `src/App.jsx`)
3. Click the **pencil icon** (Edit this file) in the top-right of the file view
4. Replace the contents with the new version
5. Click **Commit changes**
6. GitHub Actions automatically builds a new image (check the Actions tab)

For multiple files, you can also:
- Click **Add file** → **Upload files** and upload the changed files
  (GitHub will overwrite existing files with the same name)


### Pull the new image on TrueNAS

After the GitHub Action finishes (green checkmark):

1. Go to **Apps** in TrueNAS
2. Find `car-timeline`
3. Click on it, then click **Stop**
4. Wait for it to stop
5. SSH into TrueNAS and run:
   ```bash
   docker pull ghcr.io/YOUR_GITHUB_USERNAME/car-service-timeline:latest
   ```
6. Go back to the TrueNAS Apps UI and click **Start**

That's it — your app is now running the latest version.

**Shortcut**: You can also do step 5-6 entirely via SSH:
```bash
docker pull ghcr.io/YOUR_GITHUB_USERNAME/car-service-timeline:latest
# Then restart via TrueNAS UI, or if the app name is car-timeline:
midclt call app.stop car-timeline
# wait a few seconds
midclt call app.start car-timeline
```

---

## Troubleshooting

### "Image not found" when starting the app on TrueNAS

- Make sure the GitHub Actions build completed successfully (green ✓ in Actions tab)
- Make sure the package is set to Public (Part 1, Step 5)
- Make sure the username in your YAML is lowercase
- Try pulling manually via SSH: `docker pull ghcr.io/yourusername/car-service-timeline:latest`

### The app starts but I get a blank page

- Check the container logs in TrueNAS: click on the app → Logs
- The API should print: `🔩 Car Service Timeline API running on http://0.0.0.0:3000`
- If you see errors about the database, check that the volume path is correct and the dataset exists

### GitHub Actions build fails

- Click on the failed run in the Actions tab to see the error
- Common issues:
  - Missing files (make sure all files were uploaded, especially `.github/workflows/build.yml`)
  - The `.github` folder wasn't uploaded (it's hidden — see Part 1, Step 3)

### I want to change the port

Edit the YAML in TrueNAS: change `3100:3000` to `YOURPORT:3000`. The second number (3000) must stay the same — that's the internal port the app listens on.

---

## Quick Reference

| What | Where |
|------|-------|
| Your code | `https://github.com/YOUR_USERNAME/car-service-timeline` |
| Build status | `https://github.com/YOUR_USERNAME/car-service-timeline/actions` |
| Docker image | `ghcr.io/YOUR_USERNAME/car-service-timeline:latest` |
| App on TrueNAS | `http://<truenas-ip>:3100` |
| Database file | `/mnt/tank/car-timeline-data/timeline.db` (on TrueNAS) |
| Backup | Export button in the app, or copy `timeline.db` |
