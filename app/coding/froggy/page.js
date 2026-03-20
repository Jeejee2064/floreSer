"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS       = 11;
const LANE_COUNT = 8;
const CELL       = 52;
const W          = COLS * CELL;
const H          = (LANE_COUNT + 2) * CELL;

const CAR_COLORS = ["#e74c3c", "#f39c12", "#9b59b6", "#3498db", "#16a085"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const laneDefaults = (type) => {
  if (type === "river") return { speed: 2, count: 3, size: 2, dir: 1 };
  if (type === "road")  return { speed: 2, count: 2, size: 1, dir: 1 };
  return {};
};

const makeLanes = () => Array.from({ length: LANE_COUNT }, () => ({ type: "grass" }));

function buildObjects(lanes) {
  const objs = [];
  lanes.forEach((ln, i) => {
    const row = i + 1;
    const vx  = (ln.speed ?? 2) * (ln.dir ?? 1);
    if (ln.type === "river") {
      const count  = Math.max(1, ln.count ?? 3);
      const logW   = Math.max(CELL * 0.75, (ln.size ?? 2) * CELL - 8);
      const spacing = W / count;
      for (let j = 0; j < count; j++)
        objs.push({ type: "log", row, x: j * spacing, y: row * CELL + 5, w: logW, h: CELL - 10, vx });
    } else if (ln.type === "road") {
      const count   = Math.max(1, ln.count ?? 2);
      const carW    = Math.max(CELL * 0.55, CELL - 10);
      const spacing = W / count;
      const color   = CAR_COLORS[i % CAR_COLORS.length];
      for (let j = 0; j < count; j++)
        objs.push({ type: "car", row, x: j * spacing, y: row * CELL + 9, w: carW, h: CELL - 18, vx, color });
    }
  });
  return objs;
}

// ─── Canvas drawing ───────────────────────────────────────────────────────────
function drawCanvas(ctx, lanes, objects, frog) {
  ctx.clearRect(0, 0, W, H);

  // Goal
  ctx.fillStyle = "#c8940a";
  ctx.fillRect(0, 0, W, CELL);
  ctx.fillStyle = "#fff8e0";
  ctx.font = `bold ${Math.round(CELL * 0.38)}px sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("🏁  Finish!", W / 2, CELL / 2);

  // Lanes
  lanes.forEach((ln, i) => {
    const y   = (i + 1) * CELL;
    const alt = i % 2 === 0;
    if (ln.type === "grass") {
      ctx.fillStyle = alt ? "#4a7c3f" : "#3d6b34";
      ctx.fillRect(0, y, W, CELL);
    } else if (ln.type === "river") {
      ctx.fillStyle = alt ? "#1a5fa8" : "#174d8a";
      ctx.fillRect(0, y, W, CELL);
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      for (let wx = 0; wx < W; wx += 28) {
        ctx.beginPath();
        ctx.moveTo(wx, y + CELL * 0.38);
        ctx.quadraticCurveTo(wx + 10, y + CELL * 0.28, wx + 20, y + CELL * 0.38);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = alt ? "#555" : "#444";
      ctx.fillRect(0, y, W, CELL);
      ctx.save();
      ctx.strokeStyle = "#f0c040"; ctx.lineWidth = 1.5; ctx.setLineDash([14, 10]);
      ctx.beginPath(); ctx.moveTo(0, y + CELL / 2); ctx.lineTo(W, y + CELL / 2); ctx.stroke();
      ctx.restore();
    }
  });

  // Start
  ctx.fillStyle = "#3d2b1a";
  ctx.fillRect(0, (LANE_COUNT + 1) * CELL, W, CELL);
  ctx.fillStyle = "#9a7a50";
  ctx.font = `${Math.round(CELL * 0.3)}px sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("START", W / 2, (LANE_COUNT + 1) * CELL + CELL / 2);

  // Objects
  objects.forEach((o) => {
    if (o.type === "log") {
      ctx.fillStyle = "#8B5E3C";
      ctx.beginPath(); ctx.roundRect(o.x, o.y, o.w, o.h, 6); ctx.fill();
      ctx.strokeStyle = "#5c3d1e"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1;
      for (let gx = o.x + 14; gx < o.x + o.w - 6; gx += 18) {
        ctx.beginPath(); ctx.moveTo(gx, o.y + 5); ctx.lineTo(gx, o.y + o.h - 5); ctx.stroke();
      }
    } else if (o.type === "car") {
      ctx.fillStyle = o.color;
      ctx.beginPath(); ctx.roundRect(o.x, o.y, o.w, o.h, 5); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(o.x + 5, o.y + 3, o.w - 10, (o.h - 6) * 0.4);
    }
  });

  // Frog
  if (frog) {
    const fx = frog.x * CELL + CELL / 2;
    const fy = frog.y * CELL + CELL / 2;
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath(); ctx.ellipse(fx, fy + 2, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
    [[-7, -6], [7, -6]].forEach(([ex, ey]) => {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(fx + ex, fy + ey, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(fx + ex, fy + ey, 2.8, 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = "#27ae60"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(fx, fy + 5, 5, 0.1, Math.PI - 0.1); ctx.stroke();
  }
}

// ─── Compact slider — fits in a tight row ─────────────────────────────────────

function DPadBtn({ label, onActivate }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); setPressed(true); onActivate(); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: "100%", height: "100%", borderRadius: 12, border: "none",
        background: pressed ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)",
        color: "#fff", fontSize: 24, cursor: "pointer",
        transform: pressed ? "scale(0.9)" : "scale(1)",
        transition: "transform .08s, background .08s",
        display: "flex", alignItems: "center", justifyContent: "center",
        WebkitUserSelect: "none", userSelect: "none", touchAction: "none",
      }}
    >{label}</button>
  );
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ─── Save Modal ───────────────────────────────────────────────────────────────
function SaveModal({ lanes, existingId, existingName, onClose, onSaved }) {
  const isEditing = Boolean(existingId);
  const [name,        setName]        = useState(existingName || "");
  const [creatorName, setCreatorName] = useState("");
  const [status,      setStatus]      = useState("idle");
  const [errMsg,      setErrMsg]      = useState("");

  async function handleSave() {
    if (!name.trim() || !creatorName.trim()) return;
    setStatus("saving"); setErrMsg("");
    let error, data;
    if (isEditing) {
      ({ error } = await supabase
        .from("frogger_levels")
        .update({ name: name.trim(), creator_name: creatorName.trim(), lanes })
        .eq("id", existingId));
    } else {
      ({ error, data } = await supabase
        .from("frogger_levels")
        .insert({ name: name.trim(), creator_name: creatorName.trim(), lanes })
        .select("id")
        .single());
    }
    if (error) { setErrMsg(error.message); setStatus("error"); }
    else       { setStatus("saved"); onSaved?.({ name: name.trim(), id: data?.id }); }
  }

  const backdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  // tiny lane swatch strip preview
  const LaneStrip = () => (
    <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
      {lanes.map((ln, i) => {
        const alt = i % 2 === 0;
        const bg = ln.type === "grass" ? (alt ? "#4a7c3f" : "#3d6b34")
                 : ln.type === "river" ? (alt ? "#1a5fa8" : "#174d8a")
                 : (alt ? "#555" : "#444");
        return <div key={i} style={{ flex: 1, height: 18, background: bg, borderRadius: 3 }} />;
      })}
    </div>
  );

  return (
    <div onClick={backdrop} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 100, padding: 16,
    }}>
      <div style={{
        background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 20, padding: 28, width: "100%", maxWidth: 380,
        fontFamily: "system-ui, sans-serif", color: "#fff", boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
      }}>
        {status !== "saved" ? (
          <>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(46,204,113,0.15)", border: "1px solid rgba(46,204,113,0.3)",
              borderRadius: 99, padding: "3px 12px", marginBottom: 12,
              fontSize: 11, fontWeight: 700, color: "#2ecc71", textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              {isEditing ? "✏️ Update Level" : "💾 Save Level"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {isEditing ? "Update your level" : "Name your level"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20, lineHeight: 1.5 }}>
              {isEditing ? "Changes will overwrite the existing saved version." : "Saved to your level library for future play."}
            </div>

            <LaneStrip />

            {[
              { label: "Level name", val: name, set: setName, placeholder: "e.g. The Gauntlet, Slow River…" },
              { label: "Your name",  val: creatorName, set: setCreatorName, placeholder: "e.g. Alex" },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
                <input
                  type="text" maxLength={48} value={val}
                  onChange={e => set(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                  placeholder={placeholder}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.15)",
                    borderRadius: 12, padding: "10px 14px", fontSize: 14, color: "#fff",
                    outline: "none", fontFamily: "inherit",
                  }}
                  onFocus={e => e.target.style.borderColor = "#2ecc71"}
                  onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                />
              </div>
            ))}

            {status === "error" && (
              <div style={{ fontSize: 12, color: "#e74c3c", background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                ⚠ {errMsg || "Something went wrong."}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button onClick={onClose} disabled={status === "saving"} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || !creatorName.trim() || status === "saving"}
                style={{ flex: 2, padding: "11px 0", borderRadius: 12, border: "none", background: (!name.trim() || !creatorName.trim()) ? "rgba(46,204,113,0.3)" : "#2ecc71", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "uppercase" }}
              >{status === "saving" ? "⏳ Saving…" : isEditing ? "Update →" : "Save →"}</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>{isEditing ? "✅" : "🎉"}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#2ecc71", marginBottom: 8 }}>{isEditing ? "Updated!" : "Saved!"}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
              "{name}" {isEditing ? "has been updated." : "added to your library."}
            </div>
            <button onClick={onClose} style={{ padding: "11px 36px", borderRadius: 12, border: "none", background: "#fff", color: "#111", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Library Modal ────────────────────────────────────────────────────────────
function LibraryModal({ onClose, onEdit }) {
  const [levels,        setLevels]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [deleting,      setDeleting]      = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("frogger_levels")
        .select("id, name, creator_name, lanes, created_at")
        .order("created_at", { ascending: false });
      setLevels(data || []);
      setLoading(false);
    })();
  }, []);

  async function handleDelete(id) {
    setDeleting(id);
    await supabase.from("frogger_levels").delete().eq("id", id);
    setLevels(prev => prev.filter(l => l.id !== id));
    setDeleting(null); setConfirmDelete(null);
  }

  const LaneStrip = ({ lanes }) => (
    <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
      {(lanes || []).map((ln, i) => {
        const alt = i % 2 === 0;
        const bg = ln.type === "grass" ? (alt ? "#4a7c3f" : "#3d6b34")
                 : ln.type === "river" ? (alt ? "#1a5fa8" : "#174d8a")
                 : (alt ? "#555" : "#444");
        return <div key={i} style={{ flex: 1, height: 14, background: bg, borderRadius: 2 }} />;
      })}
    </div>
  );

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 100, padding: 16,
    }}>
      <div style={{
        background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20, width: "100%", maxWidth: 640,
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7)", fontFamily: "system-ui, sans-serif", color: "#fff",
      }}>
        {/* header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(46,204,113,0.12)", border: "1px solid rgba(46,204,113,0.25)", borderRadius: 99, padding: "2px 10px", marginBottom: 4, fontSize: 10, fontWeight: 700, color: "#2ecc71", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              🐸 My Levels
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Saved Levels</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.4)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div>Loading levels…</div>
            </div>
          ) : levels.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🐸</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>No levels saved yet</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Design a level and save it to your library!</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {levels.map(lvl => {
                const isConfirming = confirmDelete === lvl.id;
                const isDeleting   = deleting === lvl.id;
                return (
                  <div key={lvl.id} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "14px 14px 0" }}>
                      <LaneStrip lanes={lvl.lanes} />
                    </div>
                    <div style={{ padding: "4px 14px 14px" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{lvl.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                        {(lvl.lanes || []).length} lanes · {fmtDate(lvl.created_at)}
                        {lvl.creator_name && <> · <span style={{ color: "rgba(255,255,255,0.6)" }}>{lvl.creator_name}</span></>}
                      </div>
                      {isConfirming ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Keep</button>
                          <button onClick={() => handleDelete(lvl.id)} disabled={isDeleting} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#e74c3c", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: isDeleting ? 0.5 : 1 }}>{isDeleting ? "…" : "Delete"}</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => onEdit(lvl)} style={{ flex: 2, padding: "8px 0", borderRadius: 8, border: "none", background: "#2ecc71", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✏ Edit</button>
                          <button onClick={() => setConfirmDelete(lvl.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>🗑</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compact slider — fits in a tight row ─────────────────────────────────────
function CompactSlider({ icon, min, max, step, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        style={{ width: 68, accentColor: "#2ecc71" }}
      />
      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 22, color: "#333", textAlign: "right" }}>
        {step < 1 ? parseFloat(value).toFixed(1) : parseInt(value)}
      </span>
    </div>
  );
}

// ─── Edit Screen ──────────────────────────────────────────────────────────────
function EditScreen({ lanes, setLanes, onPlay, onSave, currentLevelName }) {
  const canvasRef  = useRef(null);
  const bodyRef    = useRef(null);
  const [rowH, setRowH] = useState(52); // derived from actual available height

  const updateLane = (i, patch) =>
    setLanes(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const setType = (i, type) =>
    setLanes(prev => prev.map((l, idx) => idx === i ? { type, ...laneDefaults(type) } : l));

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawCanvas(ctx, lanes, buildObjects(lanes), null);
  }, [lanes]);

  // Measure available body height and derive rowH so all 8 lanes + 2 spacers fit
  useEffect(() => {
    const measure = () => {
      if (!bodyRef.current) return;
      const availH = bodyRef.current.clientHeight;
      // 8 lane rows + 2 × 0.6 spacers (top/bottom) = 8 + 1.2 = 9.2 units
      const rh = Math.floor(availH / (LANE_COUNT + 1.2));
      setRowH(Math.max(36, Math.min(rh, 72))); // clamp 36–72
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (bodyRef.current) ro.observe(bodyRef.current);
    return () => ro.disconnect();
  }, []);

  const spacerH     = Math.round(rowH * 0.6);
  const totalLanesH = rowH * LANE_COUNT;
  // Canvas preview width: keep it small — just enough to show lane colours
  const previewW    = Math.round(totalLanesH * (W / H));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#faf9f7", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Header — compact single line ── */}
      <div style={{
        padding: "8px 14px", borderBottom: "1px solid #e8e5e0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#fff", flexShrink: 0, gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#111", whiteSpace: "nowrap" }}>🐸 Frogger Studio</span>
          {currentLevelName && (
            <span style={{ fontSize: 11, color: "#2ecc71", fontWeight: 600, background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.25)", borderRadius: 99, padding: "2px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
              ✏ {currentLevelName}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={onSave} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #2ecc71", background: "#fff", color: "#2ecc71", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            💾 Save
          </button>
          <button onClick={onPlay} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#2ecc71", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            ▶ Play
          </button>
        </div>
      </div>

      {/* ── Body: preview left | params right — NO scroll, fits viewport ── */}
      <div ref={bodyRef} style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 0 }}>

        {/* LEFT: canvas preview — narrow, just for lane colour reference */}
        <div style={{ flexShrink: 0, padding: "8px 0 8px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ height: spacerH }} /> {/* finish spacer */}
          <canvas
            ref={canvasRef}
            width={W} height={H}
            style={{
              display: "block",
              borderRadius: 6,
              border: "1px solid #ddd",
              height: totalLanesH,
              width: previewW,
            }}
          />
          <div style={{ height: spacerH }} /> {/* start spacer */}
        </div>

        {/* RIGHT: lane rows — each exactly rowH tall, all fit on screen */}
        <div style={{ flex: 1, padding: "8px 10px 8px 8px", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>

          {/* Finish label */}
          <div style={{ height: spacerH, display: "flex", alignItems: "center", paddingLeft: 4 }}>
            <span style={{ fontSize: 10, color: "#bbb", fontStyle: "italic" }}>🏁 finish</span>
          </div>

          {lanes.map((ln, i) => {
            const alt = i % 2 === 0;
            let swatchBg;
            if      (ln.type === "grass") swatchBg = alt ? "#4a7c3f" : "#3d6b34";
            else if (ln.type === "river") swatchBg = alt ? "#1a5fa8" : "#174d8a";
            else                          swatchBg = alt ? "#555"    : "#444";

            return (
              <div key={i} style={{
                height: rowH,
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderTop: "1px solid #f0ede8",
                overflow: "hidden",
              }}>
                {/* Colour swatch */}
                <div style={{
                  width: 28, height: 28, borderRadius: 5, flexShrink: 0,
                  background: swatchBg,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)",
                }} />

                {/* Type toggle buttons — emoji only to save space */}
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  {[
                    { t: "grass", emoji: "🌿", color: "#2d6a27" },
                    { t: "river", emoji: "💧", color: "#1a5fa8" },
                    { t: "road",  emoji: "🚗", color: "#444"    },
                  ].map(({ t, emoji, color }) => {
                    const active = ln.type === t;
                    return (
                      <button key={t} onClick={() => setType(i, t)} style={{
                        width: 34, height: 30, borderRadius: 6, fontSize: 15,
                        cursor: "pointer", border: `1.5px solid ${active ? color : "#ddd"}`,
                        background: active ? color : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>{emoji}</button>
                    );
                  })}
                </div>

                {/* Params — only shown for road/river, compact sliders + dir buttons */}
                {(ln.type === "river" || ln.type === "road") && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden", flex: 1 }}>

                    <CompactSlider
                      icon="⚡"
                      min={0.5} max={12} step={0.5}
                      value={ln.speed ?? 2}
                      onChange={v => updateLane(i, { speed: v })}
                    />

                    <CompactSlider
                      icon={ln.type === "river" ? "🪵" : "🚗"}
                      min={1} max={8} step={1}
                      value={ln.count ?? (ln.type === "river" ? 3 : 2)}
                      onChange={v => updateLane(i, { count: v })}
                    />

                    {ln.type === "river" && (
                      <CompactSlider
                        icon="📐"
                        min={1} max={5} step={1}
                        value={ln.size ?? 2}
                        onChange={v => updateLane(i, { size: v })}
                      />
                    )}

                    {/* Direction */}
                    <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                      {[1, -1].map(d => (
                        <button key={d} onClick={() => updateLane(i, { dir: d })} style={{
                          width: 28, height: 28, borderRadius: 5, fontSize: 13,
                          cursor: "pointer", border: "1.5px solid",
                          borderColor: (ln.dir ?? 1) === d ? "#333" : "#ddd",
                          background:  (ln.dir ?? 1) === d ? "#333" : "#fff",
                          color:        (ln.dir ?? 1) === d ? "#fff" : "#aaa",
                          flexShrink: 0,
                        }}>{d === 1 ? "→" : "←"}</button>
                      ))}
                    </div>

                  </div>
                )}
              </div>
            );
          })}

          {/* Start label */}
          <div style={{ height: spacerH, display: "flex", alignItems: "center", borderTop: "1px solid #f0ede8", paddingLeft: 4 }}>
            <span style={{ fontSize: 10, color: "#bbb", fontStyle: "italic" }}>🐸 start</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Play Screen ──────────────────────────────────────────────────────────────
function PlayScreen({ lanes, onEdit }) {
  const canvasRef = useRef(null);
  const gRef = useRef({
    objects: [], raf: null, lastTime: 0, phase: "playing", lives: 3,
    frog: { x: Math.floor(COLS / 2), y: LANE_COUNT + 1, onLog: false, logVx: 0 },
  });
  const [lives, setLives] = useState(3);
  const [phase, setPhase] = useState("playing");
  const [hitFlash, setHitFlash] = useState(false); // red screen flash on each death

  const resetFrog = () => {
    gRef.current.frog = { x: Math.floor(COLS / 2), y: LANE_COUNT + 1, onLog: false, logVx: 0 };
  };

  const die = useCallback(() => {
    const g = gRef.current;
    // Pause the loop immediately
    if (g.raf) { cancelAnimationFrame(g.raf); g.raf = null; }
    g.phase = "hit"; // temporary pause state

    g.lives -= 1;
    setLives(g.lives);
    setHitFlash(true);

    setTimeout(() => {
      setHitFlash(false);
      if (g.lives <= 0) {
        g.phase = "dead";
        setPhase("dead");
      } else {
        resetFrog();
        g.phase = "playing";
        g.lastTime = 0;
        g.raf = requestAnimationFrame(tick);
      }
    }, 700);
  }, []);

  const tick = useCallback((ts) => {
    const g = gRef.current;
    if (g.phase !== "playing") return;
    if (!g.lastTime) g.lastTime = ts;
    const dt = Math.min((ts - g.lastTime) / 1000, 0.05);
    g.lastTime = ts;

    g.objects.forEach((o) => {
      o.x += o.vx * dt * 60;
      if (o.vx > 0 && o.x > W + o.w)  o.x = -o.w;
      if (o.vx < 0 && o.x + o.w < -o.w) o.x = W + o.w;
    });

    const { frog } = g;
    const fx = frog.x * CELL + CELL / 2;
    const fy = frog.y * CELL + CELL / 2;
    const row = frog.y;

    if (row === 0) {
      g.phase = "win"; setPhase("win");
      if (g.raf) cancelAnimationFrame(g.raf);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) drawCanvas(ctx, lanes, g.objects, frog);
      return;
    }

    if (row >= 1 && row <= LANE_COUNT) {
      const ln = lanes[row - 1];
      if (ln.type === "river") {
        frog.onLog = false; frog.logVx = 0;
        for (const o of g.objects) {
          if (o.type === "log" && o.row === row && fx > o.x && fx < o.x + o.w && fy > o.y && fy < o.y + o.h) {
            frog.onLog = true; frog.logVx = o.vx; break;
          }
        }
        if (frog.onLog) {
          frog.x += (frog.logVx * dt * 60) / CELL;
          if (frog.x < 0 || frog.x >= COLS) { die(); return; }
        } else { die(); return; }
      } else if (ln.type === "road") {
        for (const o of g.objects) {
          if (o.type === "car" && o.row === row &&
              fx > o.x + 3 && fx < o.x + o.w - 3 &&
              fy > o.y + 2 && fy < o.y + o.h - 2) { die(); return; }
        }
      }
    }

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawCanvas(ctx, lanes, g.objects, frog);
    g.raf = requestAnimationFrame(tick);
  }, [lanes, die]);

  const startRound = useCallback(() => {
    const g = gRef.current;
    if (g.raf) cancelAnimationFrame(g.raf);
    g.objects = buildObjects(lanes);
    resetFrog();
    g.lives = 3; g.phase = "playing"; g.lastTime = 0;
    setLives(3); setPhase("playing"); setHitFlash(false);
    g.raf = requestAnimationFrame(tick);
  }, [lanes, tick]);

  useEffect(() => {
    startRound();
    return () => { if (gRef.current.raf) cancelAnimationFrame(gRef.current.raf); };
  }, [startRound]);

  const move = useCallback((dx, dy) => {
    const g = gRef.current;
    if (g.phase !== "playing") return;
    const nx = g.frog.x + dx, ny = g.frog.y + dy;
    if (nx >= 0 && nx < COLS && ny >= 0 && ny <= LANE_COUNT + 1) { g.frog.x = nx; g.frog.y = ny; }
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const map = { ArrowUp:[0,-1], w:[0,-1], ArrowDown:[0,1], s:[0,1], ArrowLeft:[-1,0], a:[-1,0], ArrowRight:[1,0], d:[1,0] };
      if (map[e.key]) { e.preventDefault(); move(...map[e.key]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  // D-pad grid — reused in both layouts
  const DPad = ({ btnSize = 72, gap = 10 }) => (
    <div style={{ display: "grid", gridTemplateColumns: `${btnSize}px ${btnSize}px ${btnSize}px`, gridTemplateRows: `${btnSize}px ${btnSize}px ${btnSize}px`, gap }}>
      <div /><DPadBtn label="▲" onActivate={() => move(0, -1)} /><div />
      <DPadBtn label="◀" onActivate={() => move(-1, 0)} />
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12 }} />
      <DPadBtn label="▶" onActivate={() => move(1, 0)} />
      <div /><DPadBtn label="▼" onActivate={() => move(0, 1)} /><div />
    </div>
  );

  const Overlay = () => (
    <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ fontSize: 56 }}>{phase === "win" ? "🎉" : "💀"}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
        {phase === "win" ? "You made it!" : "Game over!"}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center", padding: "0 24px", lineHeight: 1.5 }}>
        {phase === "win" ? "Your level is beatable! 🐸" : "All lives lost. Better luck next time!"}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button onClick={startRound} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "#2ecc71", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          ↺ Play again
        </button>
        <button onClick={onEdit} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          ✏️ Edit level
        </button>
      </div>
    </div>
  );

  // Red flash shown for 700ms each time the frog dies (but still has lives left)
  const HitFlash = () => (
    <div style={{
      position: "absolute", inset: 0, borderRadius: 12,
      background: "rgba(231,76,60,0.45)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
      pointerEvents: "none",
      animation: "fadeFlash 0.7s ease-out forwards",
    }}>
      <style>{`@keyframes fadeFlash { 0%{opacity:1} 100%{opacity:0} }`}</style>
      <div style={{ fontSize: 48 }}>💥</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
        {lives > 0 ? `${lives} ${lives === 1 ? "life" : "lives"} left` : "Last life!"}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "100%", background: "#1a1a2e", fontFamily: "system-ui, sans-serif" }}>

      {/* ── LEFT: canvas fills all available height ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "stretch", justifyContent: "center", padding: 12, minWidth: 0 }}>
        <div style={{ position: "relative", height: "100%", aspectRatio: `${W} / ${H}`, maxWidth: "100%" }}>
          <canvas
            ref={canvasRef}
            width={W} height={H}
            style={{ display: "block", width: "100%", height: "100%", borderRadius: 12 }}
          />
          {hitFlash && <HitFlash />}
          {(phase === "dead" || phase === "win") && <Overlay />}
        </div>
      </div>

      {/* ── RIGHT: controls column ── */}
      <div style={{
        width: 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 16px 24px",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
      }}>

        {/* Top: lives + action buttons */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%" }}>
          {/* Lives */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} style={{ fontSize: 26, opacity: i < lives ? 1 : 0.2 }}>❤️</span>
            ))}
          </div>

          {/* Restart */}
          <button onClick={startRound} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            ↺ Restart
          </button>

          {/* Edit */}
          <button onClick={onEdit} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.55)", fontSize: 14, cursor: "pointer" }}>
            ✏️ Edit
          </button>
        </div>

        {/* Bottom: D-pad */}
        <DPad btnSize={64} gap={8} />
      </div>
    </div>
  );
}

// ─── Menu Screen ──────────────────────────────────────────────────────────────
function MenuScreen({ onNew, onLibrary }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", background: "#1a1a2e", fontFamily: "system-ui, sans-serif", color: "#fff", gap: 16 }}>
      <div style={{ fontSize: 64, marginBottom: 4 }}>🐸</div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>Frogger Studio</div>
      <div style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", marginBottom: 24 }}>Design, save, and play your own levels</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        <button onClick={onNew} style={{ padding: "18px 0", borderRadius: 14, border: "none", background: "#2ecc71", color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer" }}>
          ✏️ New Level
        </button>
        <button onClick={onLibrary} style={{ padding: "16px 0", borderRadius: 14, border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
          📚 My Levels
        </button>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function FroggerStudio() {
  const [screen,         setScreen]         = useState("menu");
  const [lanes,          setLanes]          = useState(makeLanes);
  const [showSaveModal,  setShowSaveModal]  = useState(false);
  const [showLibrary,    setShowLibrary]    = useState(false);
  const [currentLevelId,   setCurrentLevelId]   = useState(null);
  const [currentLevelName, setCurrentLevelName] = useState("");

  const startNew = () => {
    setLanes(makeLanes());
    setCurrentLevelId(null);
    setCurrentLevelName("");
    setScreen("edit");
  };

  const loadLevel = (lvl) => {
    setLanes(lvl.lanes);
    setCurrentLevelId(lvl.id);
    setCurrentLevelName(lvl.name);
    setShowLibrary(false);
    setScreen("edit");
  };

  return (
    <div style={{ width: "100vw", height: "100dvh", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {screen === "menu" && (
        <MenuScreen
          onNew={startNew}
          onLibrary={() => setShowLibrary(true)}
        />
      )}

      {screen === "edit" && (
        <EditScreen
          lanes={lanes}
          setLanes={(next) => { setLanes(next); }}
          currentLevelName={currentLevelName}
          onPlay={() => setScreen("play")}
          onSave={() => setShowSaveModal(true)}
        />
      )}

      {screen === "play" && (
        <PlayScreen
          lanes={lanes}
          onEdit={() => setScreen("edit")}
        />
      )}

      {showSaveModal && (
        <SaveModal
          lanes={lanes}
          existingId={currentLevelId}
          existingName={currentLevelName}
          onClose={() => setShowSaveModal(false)}
          onSaved={({ name, id }) => {
            setCurrentLevelName(name);
            if (id) setCurrentLevelId(id);
          }}
        />
      )}

      {showLibrary && (
        <LibraryModal
          onClose={() => setShowLibrary(false)}
          onEdit={loadLevel}
        />
      )}
    </div>
  );
}