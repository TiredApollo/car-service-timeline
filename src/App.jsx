import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "./api.js";

const CATEGORIES = [
  { id: "oil", label: "Oil & Fluids", color: "#D4A017", icon: "💧" },
  { id: "brakes", label: "Brakes", color: "#C0392B", icon: "🛑" },
  { id: "tires", label: "Tires & Wheels", color: "#2C3E50", icon: "⚙️" },
  { id: "engine", label: "Engine", color: "#E67E22", icon: "🔧" },
  { id: "electrical", label: "Electrical", color: "#2980B9", icon: "⚡" },
  { id: "body", label: "Body & Interior", color: "#8E44AD", icon: "🚗" },
  { id: "inspection", label: "Inspection / MOT", color: "#27AE60", icon: "✅" },
  { id: "other", label: "Other", color: "#7F8C8D", icon: "📋" },
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatMileage(km) {
  if (!km && km !== 0) return "";
  return Number(km).toLocaleString() + " km";
}

/* ─── Modal ─────────────────────────────────────────────────────────────── */
function EventModal({ event, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(
    event || {
      id: generateId(),
      date: new Date().toISOString().slice(0, 10),
      category: "oil",
      title: "",
      description: "",
      mileage: "",
      cost: "",
    }
  );
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const cat = CATEGORIES.find((c) => c.id === form.category);

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      await onSave(form, !!event);
      onClose();
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setSaving(true);
    try {
      await onDelete(event.id);
      onClose();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...styles.modalHeader, borderColor: cat?.color }}>
          <span style={styles.modalIcon}>{cat?.icon}</span>
          <h2 style={styles.modalTitle}>{event ? "Edit Event" : "New Event"}</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.fieldRow}>
            <div style={styles.field}>
              <label style={styles.label}>Date</label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} style={styles.input}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Title</label>
            <input ref={titleRef} type="text" placeholder="e.g. Oil change + filter" value={form.title} onChange={(e) => set("title", e.target.value)} style={styles.input} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description / Notes</label>
            <textarea placeholder="Details, part numbers, shop name…" value={form.description} onChange={(e) => set("description", e.target.value)} style={{ ...styles.input, minHeight: 72, resize: "vertical" }} />
          </div>

          <div style={styles.fieldRow}>
            <div style={styles.field}>
              <label style={styles.label}>Mileage (km)</label>
              <input type="number" placeholder="e.g. 85000" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Cost (€)</label>
              <input type="number" placeholder="e.g. 120" value={form.cost} onChange={(e) => set("cost", e.target.value)} style={styles.input} />
            </div>
          </div>
        </div>

        <div style={styles.modalFooter}>
          {event && (
            <button onClick={handleDelete} disabled={saving} style={styles.deleteBtn}>
              {saving ? "…" : "Delete"}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.date}
            style={{ ...styles.saveBtn, backgroundColor: cat?.color, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : event ? "Update" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Timeline Card ─────────────────────────────────────────────────────── */
function TimelineCard({ event, index, onEdit, side }) {
  const cat = CATEGORIES.find((c) => c.id === event.category);
  const isLeft = side === "left";

  return (
    <div style={{ ...styles.cardRow, flexDirection: isLeft ? "row" : "row-reverse" }}>
      <div
        style={{
          ...styles.card,
          borderLeft: isLeft ? `3px solid ${cat?.color}` : "none",
          borderRight: !isLeft ? `3px solid ${cat?.color}` : "none",
          animationDelay: `${index * 60}ms`,
        }}
        onClick={() => onEdit(event)}
        className="tl-card"
      >
        <div style={styles.cardTop}>
          <span style={{ ...styles.catBadge, backgroundColor: cat?.color + "18", color: cat?.color }}>
            {cat?.icon} {cat?.label}
          </span>
          <span style={styles.cardDate}>{formatDate(event.date)}</span>
        </div>
        <h3 style={styles.cardTitle}>{event.title}</h3>
        {event.description && <p style={styles.cardDesc}>{event.description}</p>}
        <div style={styles.cardMeta}>
          {event.mileage && <span style={styles.metaChip}>🛣️ {formatMileage(event.mileage)}</span>}
          {event.cost && <span style={styles.metaChip}>💰 €{Number(event.cost).toFixed(2)}</span>}
        </div>
      </div>

      <div style={styles.dotCol}>
        <div style={{ ...styles.dot, backgroundColor: cat?.color }} />
      </div>

      <div style={styles.spacerCol} />
    </div>
  );
}

/* ─── Main App ──────────────────────────────────────────────────────────── */
export default function App() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ total_events: 0, total_cost: 0, max_mileage: null });
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.q = search.trim();
      else if (filterCat !== "all") params.category = filterCat;
      const data = await api.getEvents(params);
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  }, [search, filterCat]);

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch {}
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchStats()]);
      setLoading(false);
    })();
  }, [fetchEvents]);

  // Client-side filtering for combined search + category
  const filtered = events.filter((e) => {
    if (filterCat !== "all" && search.trim() && e.category !== filterCat) return false;
    return true;
  });

  const saveEvent = async (ev, isUpdate) => {
    if (isUpdate) {
      await api.updateEvent(ev.id, ev);
    } else {
      await api.createEvent(ev);
    }
    await Promise.all([fetchEvents(), fetchStats()]);
  };

  const deleteEvent = async (id) => {
    await api.deleteEvent(id);
    await Promise.all([fetchEvents(), fetchStats()]);
  };

  const handleExport = async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `car-timeline-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await api.importData(data);
        await Promise.all([fetchEvents(), fetchStats()]);
        alert(`Imported ${data.length} events.`);
      } catch (err) {
        alert("Import failed: " + err.message);
      }
    };
    input.click();
  };

  return (
    <div style={styles.root}>
      <style>{cssAnimations}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <h1 style={styles.h1}>
              <span style={styles.h1Icon}>🔩</span> Service Timeline
            </h1>
            <p style={styles.subtitle}>Visual maintenance history for your vehicle</p>
          </div>
          <div style={styles.headerActions}>
            <button onClick={handleExport} style={styles.secondaryBtn} title="Export JSON">↓ Export</button>
            <button onClick={handleImport} style={styles.secondaryBtn} title="Import JSON">↑ Import</button>
            <button onClick={() => setModal("new")} style={styles.addBtn}>+ Add Event</button>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div style={styles.statsBar}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.total_events}</span>
          <span style={styles.statLabel}>Events</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.stat}>
          <span style={styles.statValue}>€{Number(stats.total_cost).toFixed(0)}</span>
          <span style={styles.statLabel}>Total Cost</span>
        </div>
        {stats.max_mileage && (
          <>
            <div style={styles.statDivider} />
            <div style={styles.stat}>
              <span style={styles.statValue}>{formatMileage(stats.max_mileage)}</span>
              <span style={styles.statLabel}>Last Recorded</span>
            </div>
          </>
        )}
      </div>

      {/* Search + Filter */}
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.filterRow}>
          <button
            onClick={() => setFilterCat("all")}
            style={{ ...styles.filterChip, ...(filterCat === "all" ? styles.filterChipActive : {}) }}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id === filterCat ? "all" : c.id)}
              style={{
                ...styles.filterChip,
                ...(filterCat === c.id
                  ? { ...styles.filterChipActive, backgroundColor: c.color, borderColor: c.color }
                  : {}),
              }}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={styles.timeline}>
        {filtered.length > 0 && <div style={styles.centerLine} />}

        {loading && (
          <div style={styles.empty}>
            <p style={{ fontSize: 15, opacity: 0.7 }}>Loading…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={styles.empty}>
            {events.length === 0 && !search.trim() ? (
              <>
                <span style={{ fontSize: 40 }}>🛠️</span>
                <p style={{ marginTop: 12, fontSize: 15, opacity: 0.7 }}>
                  No events yet — tap <strong>+ Add Event</strong> to start building your timeline.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 15, opacity: 0.7 }}>No events match your search.</p>
            )}
          </div>
        )}

        {filtered.map((ev, i) => (
          <TimelineCard key={ev.id} event={ev} index={i} onEdit={(e) => setModal(e)} side={i % 2 === 0 ? "left" : "right"} />
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <EventModal
          event={modal === "new" ? null : modal}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ─── CSS Animations ────────────────────────────────────────────────────── */
const cssAnimations = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;1,9..40,400&family=Space+Mono:wght@400;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #F7F5F0; }

  .tl-card {
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    cursor: pointer;
    animation: fadeSlideIn 0.35s ease both;
  }
  .tl-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #D4A017 !important;
    box-shadow: 0 0 0 3px rgba(212,160,23,0.15);
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }

  @media (max-width: 700px) {
    .tl-card { min-width: 0 !important; }
  }
`;

/* ─── Styles ────────────────────────────────────────────────────────────── */
const styles = {
  root: {
    fontFamily: "'DM Sans', sans-serif",
    background: "linear-gradient(170deg, #F7F5F0 0%, #EDE9E0 100%)",
    minHeight: "100vh",
    color: "#2C2A26",
    paddingBottom: 80,
  },
  header: {
    background: "linear-gradient(135deg, #2C2A26 0%, #3D3A33 100%)",
    padding: "32px 24px 28px",
  },
  headerInner: {
    maxWidth: 800,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 16,
  },
  h1: {
    margin: 0, fontSize: 28, fontWeight: 700, color: "#F7F5F0",
    letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10,
  },
  h1Icon: { fontSize: 26 },
  subtitle: {
    margin: "4px 0 0", fontSize: 13, color: "rgba(247,245,240,0.55)",
    fontFamily: "'Space Mono', monospace", letterSpacing: "0.5px",
  },
  headerActions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  addBtn: {
    fontFamily: "'DM Sans', sans-serif", background: "#D4A017", color: "#2C2A26",
    border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14,
    fontWeight: 700, cursor: "pointer", letterSpacing: "0.3px",
  },
  secondaryBtn: {
    fontFamily: "'DM Sans', sans-serif", background: "rgba(247,245,240,0.12)",
    color: "#F7F5F0", border: "1px solid rgba(247,245,240,0.2)", borderRadius: 8,
    padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  statsBar: {
    maxWidth: 800, margin: "-20px auto 0", background: "#FFFDF8", borderRadius: 12,
    padding: "16px 28px", display: "flex", alignItems: "center", gap: 24,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", flexWrap: "wrap", position: "relative",
    zIndex: 2, width: "calc(100% - 48px)",
  },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 70 },
  statValue: { fontSize: 20, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#2C2A26" },
  statLabel: { fontSize: 11, color: "#9E9A90", fontWeight: 500, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.5px" },
  statDivider: { width: 1, height: 32, background: "#E8E4DB" },
  controls: { maxWidth: 800, margin: "20px auto 0", padding: "0 24px" },
  searchInput: {
    fontFamily: "'DM Sans', sans-serif", width: "100%", padding: "10px 14px",
    fontSize: 14, border: "1.5px solid #DDD8CE", borderRadius: 8,
    background: "#FFFDF8", color: "#2C2A26",
  },
  filterRow: { display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" },
  filterChip: {
    fontFamily: "'DM Sans', sans-serif", padding: "5px 12px", fontSize: 12,
    fontWeight: 500, border: "1.5px solid #DDD8CE", borderRadius: 20,
    background: "transparent", cursor: "pointer", color: "#6B6760",
    transition: "all 0.15s", whiteSpace: "nowrap",
  },
  filterChipActive: { background: "#2C2A26", color: "#F7F5F0", borderColor: "#2C2A26" },
  timeline: { maxWidth: 800, margin: "28px auto 0", padding: "0 24px", position: "relative" },
  centerLine: {
    position: "absolute", left: "50%", top: 0, bottom: 0, width: 2,
    background: "linear-gradient(to bottom, #DDD8CE, transparent)",
    transform: "translateX(-1px)", zIndex: 0,
  },
  cardRow: { display: "flex", alignItems: "flex-start", marginBottom: 20, position: "relative", zIndex: 1 },
  card: {
    flex: "0 1 calc(50% - 28px)", background: "#FFFDF8", borderRadius: 10,
    padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
  },
  dotCol: { width: 16, display: "flex", justifyContent: "center", paddingTop: 18, flexShrink: 0 },
  dot: { width: 10, height: 10, borderRadius: "50%", border: "2px solid #FFFDF8", boxShadow: "0 0 0 2px rgba(0,0,0,0.08)" },
  spacerCol: { flex: "0 1 calc(50% - 28px)" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 },
  catBadge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 12, letterSpacing: "0.3px" },
  cardDate: { fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#9E9A90" },
  cardTitle: { margin: "0 0 4px", fontSize: 15, fontWeight: 700, lineHeight: 1.3 },
  cardDesc: { margin: "0 0 8px", fontSize: 13, color: "#6B6760", lineHeight: 1.45 },
  cardMeta: { display: "flex", gap: 10, flexWrap: "wrap" },
  metaChip: { fontSize: 11, fontFamily: "'Space Mono', monospace", color: "#9E9A90", background: "#F3F0E9", padding: "2px 8px", borderRadius: 6 },
  empty: { textAlign: "center", padding: "60px 20px", color: "#9E9A90" },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(44,42,38,0.45)",
    backdropFilter: "blur(4px)", display: "flex", justifyContent: "center",
    alignItems: "center", zIndex: 1000, padding: 16,
  },
  modal: {
    background: "#FFFDF8", borderRadius: 14, width: "100%", maxWidth: 500,
    maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
  },
  modalHeader: { display: "flex", alignItems: "center", gap: 10, padding: "18px 20px", borderBottom: "2px solid" },
  modalIcon: { fontSize: 22 },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, flex: 1 },
  closeBtn: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9E9A90", padding: 4 },
  modalBody: { padding: "18px 20px" },
  modalFooter: { display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderTop: "1px solid #EDE9E0" },
  fieldRow: { display: "flex", gap: 12, marginBottom: 0 },
  field: { flex: 1, marginBottom: 14 },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#9E9A90", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 },
  input: { fontFamily: "'DM Sans', sans-serif", width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #DDD8CE", borderRadius: 8, background: "#FFFDF8", color: "#2C2A26" },
  deleteBtn: { fontFamily: "'DM Sans', sans-serif", background: "none", border: "1.5px solid #C0392B", color: "#C0392B", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  cancelBtn: { fontFamily: "'DM Sans', sans-serif", background: "none", border: "none", color: "#9E9A90", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "8px 12px" },
  saveBtn: { fontFamily: "'DM Sans', sans-serif", border: "none", color: "#FFF", borderRadius: 8, padding: "9px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
