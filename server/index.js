import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

// ── Database setup ──────────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "timeline.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,
    date        TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'other',
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    mileage     REAL,
    cost        REAL,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);
  CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
`);

// ── Prepared statements ─────────────────────────────────────────────────────
const stmts = {
  getAll: db.prepare(`SELECT * FROM events ORDER BY date DESC, created_at DESC`),

  search: db.prepare(`
    SELECT * FROM events
    WHERE title LIKE @q OR description LIKE @q OR category LIKE @q OR date LIKE @q
    ORDER BY date DESC
  `),

  getByCategory: db.prepare(`SELECT * FROM events WHERE category = ? ORDER BY date DESC`),

  getOne: db.prepare(`SELECT * FROM events WHERE id = ?`),

  insert: db.prepare(`
    INSERT INTO events (id, date, category, title, description, mileage, cost)
    VALUES (@id, @date, @category, @title, @description, @mileage, @cost)
  `),

  update: db.prepare(`
    UPDATE events
    SET date = @date, category = @category, title = @title,
        description = @description, mileage = @mileage, cost = @cost,
        updated_at = datetime('now')
    WHERE id = @id
  `),

  delete: db.prepare(`DELETE FROM events WHERE id = ?`),

  stats: db.prepare(`
    SELECT
      COUNT(*) as total_events,
      COALESCE(SUM(cost), 0) as total_cost,
      MAX(mileage) as max_mileage
    FROM events
  `),
};

// ── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Serve built frontend in production
if (isProduction) {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
}

// ── API routes ──────────────────────────────────────────────────────────────

// List all events (with optional search and category filter)
app.get("/api/events", (req, res) => {
  try {
    const { q, category } = req.query;
    let events;

    if (q) {
      events = stmts.search.all({ q: `%${q}%` });
    } else if (category && category !== "all") {
      events = stmts.getByCategory.all(category);
    } else {
      events = stmts.getAll.all();
    }

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stats
app.get("/api/stats", (_req, res) => {
  try {
    const stats = stmts.stats.get();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single event
app.get("/api/events/:id", (req, res) => {
  try {
    const event = stmts.getOne.get(req.params.id);
    if (!event) return res.status(404).json({ error: "Not found" });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create event
app.post("/api/events", (req, res) => {
  try {
    const { id, date, category, title, description, mileage, cost } = req.body;
    if (!id || !date || !title) {
      return res.status(400).json({ error: "id, date, and title are required" });
    }
    stmts.insert.run({
      id,
      date,
      category: category || "other",
      title,
      description: description || "",
      mileage: mileage ? Number(mileage) : null,
      cost: cost ? Number(cost) : null,
    });
    const event = stmts.getOne.get(id);
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update event
app.put("/api/events/:id", (req, res) => {
  try {
    const existing = stmts.getOne.get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const { date, category, title, description, mileage, cost } = req.body;
    stmts.update.run({
      id: req.params.id,
      date: date ?? existing.date,
      category: category ?? existing.category,
      title: title ?? existing.title,
      description: description ?? existing.description,
      mileage: mileage !== undefined ? (mileage ? Number(mileage) : null) : existing.mileage,
      cost: cost !== undefined ? (cost ? Number(cost) : null) : existing.cost,
    });
    const event = stmts.getOne.get(req.params.id);
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete event
app.delete("/api/events/:id", (req, res) => {
  try {
    const existing = stmts.getOne.get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    stmts.delete.run(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export as JSON
app.get("/api/export", (_req, res) => {
  try {
    const events = stmts.getAll.all();
    res.setHeader("Content-Disposition", "attachment; filename=car-timeline-export.json");
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import from JSON
app.post("/api/import", (req, res) => {
  try {
    const events = req.body;
    if (!Array.isArray(events)) return res.status(400).json({ error: "Expected array" });

    const insertMany = db.transaction((evts) => {
      for (const ev of evts) {
        const existing = stmts.getOne.get(ev.id);
        if (existing) {
          stmts.update.run({
            id: ev.id,
            date: ev.date,
            category: ev.category || "other",
            title: ev.title,
            description: ev.description || "",
            mileage: ev.mileage ? Number(ev.mileage) : null,
            cost: ev.cost ? Number(ev.cost) : null,
          });
        } else {
          stmts.insert.run({
            id: ev.id,
            date: ev.date,
            category: ev.category || "other",
            title: ev.title,
            description: ev.description || "",
            mileage: ev.mileage ? Number(ev.mileage) : null,
            cost: ev.cost ? Number(ev.cost) : null,
          });
        }
      }
    });

    insertMany(events);
    res.json({ imported: events.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback (production)
if (isProduction) {
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
  });
}

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔩 Car Service Timeline API running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Database: ${path.join(DATA_DIR, "timeline.db")}`);
});
