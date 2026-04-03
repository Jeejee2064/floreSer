'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GRID = 20;
const MAX_ATTEMPTS = 5;
const MAX_MIRRORS_PER_LEVEL = 5;
const delay = ms => new Promise(r => setTimeout(r, ms));

// ── LASER PHYSICS ──────────────────────────────────────────────────
const DIR = {
  E:  { dx:  1, dy:  0 },
  W:  { dx: -1, dy:  0 },
  N:  { dx:  0, dy: -1 },
  S:  { dx:  0, dy:  1 },
};

function reflectDir(dx, dy, angle) {
  // Convert angle to radians
  const rad = (angle * Math.PI) / 180;
  
  // Mirror normal vector (perpendicular to mirror surface)
  // For a mirror at angle θ, the normal is at θ + 90°
  const normalX = Math.cos(rad + Math.PI / 2);
  const normalY = Math.sin(rad + Math.PI / 2);
  
  // Dot product of direction with normal
  const dot = dx * normalX + dy * normalY;
  
  // Reflection formula: R = V - 2*(V·N)N
  const rx = dx - 2 * dot * normalX;
  const ry = dy - 2 * dot * normalY;
  
  // Round to handle floating point errors
  return {
    dx: Math.round(rx * 10) / 10,
    dy: Math.round(ry * 10) / 10
  };
}
/**
 * Returns true if grid cell (cellX, cellY) is inside any obstacle rectangle.
 * Obstacles are { x, y, w, h } in grid-cell coordinates (top-left origin).
 */
function isCellBlocked(cellX, cellY, obstacles = []) {
  return obstacles.some(
    o => cellX >= o.x && cellX < o.x + o.w && cellY >= o.y && cellY < o.y + o.h
  );
}


function shootLaser(origin, dirKey, mirrors, target, obstacles = []) {
  // Start at the center of the origin cell
  let cx = origin.x + 0.5;
  let cy = origin.y + 0.5;
  let { dx, dy } = DIR[dirKey];
  const path = [{ x: cx, y: cy }];
  const MAX_STEPS = 300;

  for (let steps = 0; steps < MAX_STEPS; steps++) {
    // Calculate next cell boundary position (move half a cell to reach the edge)
    const nextX = cx + dx * 0.5;
    const nextY = cy + dy * 0.5;
    
    // Determine which cell we're about to enter
    const nextCellX = Math.floor(nextX);
    const nextCellY = Math.floor(nextY);
    
    // Clamp to grid bounds for out-of-bounds check
    if (nextCellX < 0 || nextCellX >= GRID || nextCellY < 0 || nextCellY >= GRID) {
      // Add the edge point and stop
      path.push({ x: nextX, y: nextY });
      return { path, hitTarget: false, hitObstacle: false };
    }

    // Check if next cell has obstacle
    if (isCellBlocked(nextCellX, nextCellY, obstacles)) {
      // Stop at the boundary before obstacle
      path.push({ x: nextX, y: nextY });
      return { path, hitTarget: false, hitObstacle: true };
    }

    // Check if next cell is target
    if (target && nextCellX === target.x && nextCellY === target.y) {
      path.push({ x: target.x + 0.5, y: target.y + 0.5 });
      return { path, hitTarget: true, hitObstacle: false };
    }

    // Check for mirror in next cell
    const mirror = mirrors.find(m => m.x === nextCellX && m.y === nextCellY);
    if (mirror) {
      // Add the boundary point where mirror is located
      path.push({ x: nextX, y: nextY });
      
      // Update position to the boundary
      cx = nextX;
      cy = nextY;
      
      // Reflect direction at the mirror
      const ref = reflectDir(dx, dy, mirror.angle);
      dx = ref.dx;
      dy = ref.dy;
      continue;
    }

    // Move to the next cell center
    cx = nextX + dx * 0.5;
    cy = nextY + dy * 0.5;
    path.push({ x: cx, y: cy });
  }

  return { path, hitTarget: false, hitObstacle: false };
}

// ── BUILT-IN LEVELS ────────────────────────────────────────────────
// obstacles: Array of { x, y, w, h } in grid-cell coordinates
const BUILTIN_LEVELS = [
  {
    id: 'b1', name: 'First Beam', difficulty: 'easy',
    hint: 'Place 1 mirror to bounce the laser to the target.',
    laserOrigin: { x: 0, y: 5 }, laserDir: 'E',
    target: { x: 9, y: 2 },
    maxMirrors: 1,
    obstacles: [],
  },
  {
    id: 'b2', name: 'Corner Shot', difficulty: 'easy',
    hint: 'Redirect down then across to find the target.',
    laserOrigin: { x: 3, y: 0 }, laserDir: 'S',
    target: { x: 10, y: 9 },
    maxMirrors: 1,
    obstacles: [],
  },
  {
    id: 'b3', name: 'The Wall', difficulty: 'easy',
    hint: 'A wall blocks the direct path. Bounce around it.',
    laserOrigin: { x: 0, y: 8 }, laserDir: 'E',
    target: { x: 14, y: 8 },
    maxMirrors: 3,
    obstacles: [
      { x: 7, y: 6, w: 1, h: 5 },
    ],
  },
  {
    id: 'b4', name: 'Pillar Dodge', difficulty: 'medium',
    hint: 'Navigate the beam between the pillars. 1 mirror needed.',
    laserOrigin: { x: 2, y: 0 }, laserDir: 'S',
    target: { x: 2, y: 18 },
    maxMirrors: 5,
    obstacles: [
      { x: 1, y: 7,  w: 1, h: 1 },
      { x: 3, y: 11, w: 1, h: 1 },
      { x: 1, y: 14, w: 1, h: 1 },
    ],
  },
  {
    id: 'b5', name: 'Double Bounce', difficulty: 'medium',
    hint: 'Place 2 mirrors. First redirect down, then across.',
    laserOrigin: { x: 0, y: 3 }, laserDir: 'E',
    target: { x: 17, y: 14 },
    maxMirrors: 5,
    obstacles: [],
  },
  {
    id: 'b6', name: 'The Corridor', difficulty: 'medium',
    hint: 'Thread the beam through the narrow gap in the wall.',
    laserOrigin: { x: 0, y: 10 }, laserDir: 'E',
    target: { x: 18, y: 5 },
    maxMirrors: 8,
    obstacles: [
      { x: 8, y: 0,  w: 2, h: 8  },
      { x: 8, y: 11, w: 2, h: 9  },
    ],
  },
  {
    id: 'b7', name: 'Zigzag Master', difficulty: 'hard',
    hint: 'Place 2 mirrors to navigate through the grid.',
    laserOrigin: { x: 10, y: 0 }, laserDir: 'S',
    target: { x: 3, y: 18 },
    maxMirrors: 8,
    obstacles: [
      { x: 5, y: 5,  w: 8, h: 1 },
      { x: 5, y: 12, w: 8, h: 1 },
    ],
  },
  {
    id: 'b8', name: 'The Maze', difficulty: 'hard',
    hint: 'Obstacles everywhere. Find the hidden path with 3 mirrors.',
    laserOrigin: { x: 0, y: 0 }, laserDir: 'E',
    target: { x: 19, y: 19 },
    maxMirrors: 9,
    obstacles: [
      { x: 4,  y: 0,  w: 1, h: 7  },
      { x: 4,  y: 9,  w: 1, h: 11 },
      { x: 9,  y: 3,  w: 1, h: 10 },
      { x: 9,  y: 15, w: 1, h: 5  },
      { x: 14, y: 0,  w: 1, h: 6  },
      { x: 14, y: 8,  w: 1, h: 12 },
    ],
  },
  {
    id: 'b9', name: 'Triple Threat', difficulty: 'expert',
    hint: 'Place 3 mirrors in a precise sequence.',
    laserOrigin: { x: 0, y: 0 }, laserDir: 'E',
    target: { x: 19, y: 19 },
    maxMirrors: 9,
    obstacles: [],
  },
  {
    id: 'b10', name: 'Mirror Maze', difficulty: 'expert',
    hint: 'Four mirrors, many obstacles. Think before you fire.',
    laserOrigin: { x: 5, y: 0 }, laserDir: 'S',
    target: { x: 18, y: 5 },
    maxMirrors: 9,
    obstacles: [
      { x: 2,  y: 3,  w: 3, h: 1 },
      { x: 8,  y: 3,  w: 4, h: 1 },
      { x: 5,  y: 8,  w: 1, h: 5 },
      { x: 12, y: 2,  w: 1, h: 8 },
      { x: 15, y: 8,  w: 4, h: 1 },
    ],
  },
];

// ── DIFFICULTY BADGE ───────────────────────────────────────────────
function DiffBadge({ d }) {
  const map = {
    easy:   'text-emerald-400 bg-emerald-900/40 border-emerald-600/40',
    medium: 'text-yellow-400 bg-yellow-900/40 border-yellow-600/40',
    hard:   'text-red-400 bg-red-900/40 border-red-600/40',
    expert: 'text-purple-400 bg-purple-900/40 border-purple-600/40',
  };
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${map[d] || map.easy}`}>
      {d}
    </span>
  );
}

// ── LASER SVG PATH ─────────────────────────────────────────────────
function LaserPath({ path, color = '#f43f5e' }) {
  if (!path || path.length < 2) return null;
  const d = path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const totalLen = path.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = path[i - 1];
    return acc + Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
  }, 0);

  return (
    <g>
      {/* glow under-layer */}
      <path d={d} fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.15"
        style={{ filter: `drop-shadow(0 0 1px ${color})` }} />
      {/* core beam */}
      <motion.path d={d} fill="none" stroke={color} strokeWidth="0.18"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: Math.min(totalLen * 0.08, 1.5), ease: 'linear' }}
      />
    </g>
  );
}

// ── MIRROR VISUAL ──────────────────────────────────────────────────
function MirrorShape({ x, y, angle, highlight }) {
  const cx = x + 0.5, cy = y + 0.5;
  const rad = (angle * Math.PI) / 180;
  const len = 0.38;
  const x1 = cx - Math.cos(rad) * len, y1 = cy - Math.sin(rad) * len;
  const x2 = cx + Math.cos(rad) * len, y2 = cy + Math.sin(rad) * len;
  return (
    <g>
      {highlight && (
        <circle cx={cx} cy={cy} r="0.45" fill="none" stroke="#38bdf8"
          strokeWidth="0.07" strokeDasharray="0.15,0.1" opacity={0.7} />
      )}
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={highlight ? '#38bdf8' : '#94a3b8'}
        strokeWidth={highlight ? '0.18' : '0.14'}
        strokeLinecap="round"
        style={{ filter: highlight ? 'drop-shadow(0 0 0.3px #38bdf8)' : undefined }}
      />
      <circle cx={x1} cy={y1} r="0.055" fill={highlight ? '#38bdf8' : '#64748b'} />
      <circle cx={x2} cy={y2} r="0.055" fill={highlight ? '#38bdf8' : '#64748b'} />
    </g>
  );
}

// ── OBSTACLE VISUAL ────────────────────────────────────────────────
function ObstacleRect({ o }) {
  return (
    <g>
      {/* fill */}
      <rect x={o.x} y={o.y} width={o.w} height={o.h}
        fill="#0f172a" stroke="#334155" strokeWidth="0.07" rx="0.1" />
      {/* inner hatch lines to signal "solid wall" */}
      {Array.from({ length: Math.ceil((o.w + o.h) * 2) }).map((_, i) => {
        const offset = i * 0.6 - (o.w + o.h);
        return (
          <line key={i}
            x1={o.x + Math.max(0, offset)} y1={o.y + Math.max(0, -offset)}
            x2={o.x + Math.min(o.w, offset + o.h)} y2={o.y + Math.min(o.h, o.h - offset)}
            stroke="#1e293b" strokeWidth="0.08" strokeLinecap="round"
          />
        );
      })}
      {/* border on top of hatch */}
      <rect x={o.x} y={o.y} width={o.w} height={o.h}
        fill="none" stroke="#475569" strokeWidth="0.05" rx="0.1" />
    </g>
  );
}

// ── MAIN GAME ──────────────────────────────────────────────────────
export default function ReflexGrid() {
  const [screen, setScreen] = useState('menu');
  const [source, setSource] = useState('builtin');
  const [levelIdx, setLevelIdx] = useState(0);
  const [communityLevels, setCommunityLevels] = useState([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // per-level state
  const [placedMirrors, setPlacedMirrors] = useState([]);
  const [laserPath, setLaserPath] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [result, setResult] = useState(null);         // 'win' | 'fail' | 'miss' | 'blocked' | null
  const [showResult, setShowResult] = useState(false);
  const [pathKey, setPathKey] = useState(0);
  const [hoveredMirror, setHoveredMirror] = useState(null);

  // Mirror placement inputs
  const [newMirrorX, setNewMirrorX] = useState('');
  const [newMirrorY, setNewMirrorY] = useState('');
  const [newMirrorAngle, setNewMirrorAngle] = useState(45);
  const [placementError, setPlacementError] = useState(null);

  const levels = source === 'builtin' ? BUILTIN_LEVELS : communityLevels;
  const lvl = levels[levelIdx];

  useEffect(() => {
    if (lvl) {
      setPlacedMirrors([]);
      setLaserPath(null);
      setAttempts(0);
      setResult(null);
      setShowResult(false);
      setNewMirrorX('');
      setNewMirrorY('');
      setNewMirrorAngle(45);
      setPlacementError(null);
    }
  }, [levelIdx, source]);

  async function loadCommunity() {
    setLoadingCommunity(true);
    const { data } = await supabase
      .from('reflex_grid_levels')
      .select('*')
      .order('created_at', { ascending: false });
    setCommunityLevels((data || []).map(dbRowToLevel));
    setLoadingCommunity(false);
  }

  // ── VALIDATION ───────────────────────────────────────────────────
  function validateMirrorPlacement(x, y, existingMirrors, laserOrigin, target, obstacles) {
    if (x < 0 || x >= GRID || y < 0 || y >= GRID)
      return 'Coordinates must be within 0–19';
    if (existingMirrors.some(m => m.x === x && m.y === y))
      return 'A mirror already exists at this position';
    if (x === laserOrigin.x && y === laserOrigin.y)
      return 'Cannot place mirror on the laser origin';
    if (target && x === target.x && y === target.y)
      return 'Cannot place mirror on the target';
    if (isCellBlocked(x, y, obstacles))
      return 'Cannot place mirror inside an obstacle';
    return null;
  }

  // ── MIRROR MANAGEMENT ────────────────────────────────────────────
  function addMirror() {
    if (!lvl || result === 'win') return;
    const x = parseInt(newMirrorX);
    const y = parseInt(newMirrorY);
    if (isNaN(x) || isNaN(y)) { setPlacementError('Please enter valid coordinates'); return; }
    if (placedMirrors.length >= lvl.maxMirrors) { setPlacementError(`Maximum ${lvl.maxMirrors} mirrors allowed`); return; }
    const error = validateMirrorPlacement(x, y, placedMirrors, lvl.laserOrigin, lvl.target, lvl.obstacles || []);
    if (error) { setPlacementError(error); return; }
    setPlacedMirrors(prev => [...prev, { x, y, angle: newMirrorAngle }]);
    setNewMirrorX('');
    setNewMirrorY('');
    setPlacementError(null);
    setLaserPath(null);
    setShowResult(false);
  }

  function removeMirror(index) {
    if (result === 'win') return;
    setPlacedMirrors(prev => prev.filter((_, i) => i !== index));
    setLaserPath(null);
    setShowResult(false);
    if (hoveredMirror === index) setHoveredMirror(null);
  }

  function updateMirrorAngle(index, newAngle) {
    if (result === 'win') return;
    setPlacedMirrors(prev => prev.map((m, i) => i === index ? { ...m, angle: newAngle } : m));
    setLaserPath(null);
    setShowResult(false);
  }

  // ── FIRE ─────────────────────────────────────────────────────────
  async function handleLaunch() {
    if (!lvl) return;
    if (result === 'win' || attempts >= MAX_ATTEMPTS) return;
    if (placedMirrors.length === 0) { setPlacementError('Place at least one mirror first!'); return; }

    const { path, hitTarget, hitObstacle } = shootLaser(
      lvl.laserOrigin,
      lvl.laserDir,
      placedMirrors,
      lvl.target,
      lvl.obstacles || []
    );

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setLaserPath(path);
    setPathKey(k => k + 1);
    await delay(200);

    if (hitTarget) {
      setResult('win');
      setShowResult(true);
    } else if (newAttempts >= MAX_ATTEMPTS) {
      setResult('fail');
      setShowResult(true);
    } else {
      // 'blocked' = beam hit an obstacle but didn't reach target
      const nextResult = hitObstacle ? 'blocked' : 'miss';
      setResult(nextResult);
      setShowResult(true);
      await delay(2400);
      setShowResult(false);
      setResult(null);
      setLaserPath(null);
    }
  }

  function nextLevel() {
    const next = levelIdx + 1;
    if (next >= levels.length) setScreen('menu');
    else setLevelIdx(next);
  }

  function restartLevel() {
    if (!lvl) return;
    setPlacedMirrors([]);
    setLaserPath(null);
    setAttempts(0);
    setResult(null);
    setShowResult(false);
    setNewMirrorX('');
    setNewMirrorY('');
    setPlacementError(null);
  }

  function dirArrow(dir) {
    return { E: '→', W: '←', N: '↑', S: '↓' }[dir] || '→';
  }

  // ── MENU ─────────────────────────────────────────────────────────
  if (screen === 'menu') return (
    <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center font-mono overflow-y-auto py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg w-full px-6">

        <div className="mb-2">
          <div className="text-[10px] uppercase tracking-[0.4em] text-rose-500/70 font-bold mb-1">Laser Puzzle</div>
          <h1 className="text-6xl font-black text-white italic uppercase leading-none tracking-tight">
            Reflex<span className="text-rose-500">Grid</span>
          </h1>
          <p className="text-slate-500 text-xs mt-2 leading-relaxed">
            Place mirrors. Set angles. Fire the laser. Hit the target.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-5 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">How to Play</p>
          <div className="space-y-2.5">
            {[
              { icon: '🔴', text: 'Laser fires from origin in a fixed direction' },
              { icon: '🪞', text: 'Enter coordinates (X,Y) to place mirrors on the grid' },
              { icon: '⚙️', text: 'Set each mirror angle (0°, 45°, 90°, 135°)' },
              { icon: '🧱', text: 'Obstacles block the beam — route around them!' },
              { icon: '🚀', text: 'Press Fire to see the beam trace its path!' },
              { icon: '🎯', text: 'Hit the green target to win!' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * i }}
                className="flex items-center gap-3 text-xs text-slate-400">
                <span className="text-base w-6 shrink-0">{s.icon}</span>
                <span>{s.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mb-2">Mirror Angles Guide</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { a: 0,   sym: '|', desc: 'Vertical' },
                { a: 45,  sym: '/', desc: 'Diagonal' },
                { a: 90,  sym: '—', desc: 'Horizontal' },
                { a: 135, sym: '\\', desc: 'Diagonal' },
              ].map(({ a, sym, desc }) => (
                <div key={a} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-2 text-center">
                  <div className="text-slate-300 font-black text-lg leading-none">{sym}</div>
                  <div className="text-slate-500 text-[9px] mt-1">{a}°</div>
                  <div className="text-slate-600 text-[8px]">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-[9px] text-slate-600">
              You have <span className="text-rose-400 font-bold">{MAX_ATTEMPTS} attempts</span> per level. Place mirrors wisely!
            </p>
          </div>
        </div>

        <button
          onClick={() => { setSource('builtin'); setLevelIdx(0); setScreen('game'); }}
          className="w-full bg-rose-600 hover:bg-rose-500 py-4 rounded-xl font-black text-lg uppercase transition-all active:translate-y-0.5 shadow-lg mb-3">
          Play Campaign →
        </button>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={async () => { await loadCommunity(); setSource('community'); setLevelIdx(0); setScreen('community'); }}
            className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-black text-xs uppercase text-slate-200 transition-all">
            🌐 Community Levels
          </button>
          <a href="/coding/reflex-grid/level-designer"
            className="py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 rounded-xl font-bold text-xs uppercase text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center">
            🛠 Level Designer
          </a>
        </div>

        <p className="text-slate-700 text-[10px]">
          {MAX_ATTEMPTS} attempts · up to {MAX_MIRRORS_PER_LEVEL} mirrors · angles snap to 45°
        </p>
      </motion.div>
    </div>
  );

  // ── COMMUNITY LIST ────────────────────────────────────────────────
  if (screen === 'community') {
    if (loadingCommunity) return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-slate-500 font-mono">
        <div className="text-center"><div className="text-2xl mb-2">⏳</div><p>Loading community levels…</p></div>
      </div>
    );

    if (communityLevels.length === 0) return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-slate-500 font-mono">
        <div className="text-center max-w-md px-6">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-lg mb-2">No community levels found</p>
          <p className="text-sm text-slate-600 mb-4">Be the first to create one!</p>
          <button onClick={() => setScreen('menu')} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm uppercase">← Back to Menu</button>
        </div>
      </div>
    );

    return (
      <div className="fixed inset-0 bg-slate-950 text-white font-mono overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase">Community Levels</h1>
              <p className="text-slate-500 text-xs mt-1">{communityLevels.length} level{communityLevels.length !== 1 ? 's' : ''} available</p>
            </div>
            <button onClick={() => setScreen('menu')} className="text-xs text-slate-500 hover:text-white uppercase font-bold">← Menu</button>
          </div>
          <div className="space-y-3">
            {communityLevels.map((level, idx) => (
              <motion.button key={level.id}
                onClick={() => { setLevelIdx(idx); setScreen('game'); }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="w-full text-left bg-slate-900/60 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-lg">🎮</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white group-hover:text-sky-400 transition-colors">{level.name}</span>
                        <DiffBadge d={level.difficulty || 'medium'} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                        <span>Laser: ({level.laserOrigin.x},{level.laserOrigin.y}) {dirArrow(level.laserDir)}</span>
                        <span>Target: ({level.target.x},{level.target.y})</span>
                        <span>Max {level.maxMirrors || '?'} mirrors</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-600 group-hover:text-white transition-colors">→</div>
                </div>
                {level.hint && <p className="mt-2 text-[10px] text-slate-600 italic">"{level.hint}"</p>}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── GAME ─────────────────────────────────────────────────────────
  if (!lvl) return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center text-slate-500 font-mono">
      No level selected.
    </div>
  );

  const isOver = result === 'win' || result === 'fail';
  const canAddMirror = placedMirrors.length < lvl.maxMirrors;
  const obstacles = lvl.obstacles || [];

  // Beam color
  const beamColor =
    result === 'win'     ? '#4ade80' :
    result === 'blocked' ? '#fb923c' :
    '#f43f5e';

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col md:flex-row font-mono overflow-hidden">

      {/* ── LEFT: GRID ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 relative select-none">
        <div className="relative w-full aspect-square max-w-[560px] border-2 border-slate-800 bg-[#01040a]">

          {/* axis labels */}
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`xl-${i}`} className="absolute text-[10px] text-slate-600 pointer-events-none"
              style={{ left: `${(i * 5 / GRID) * 100}%`, top: '-18px' }}>{i * 5}</span>
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`yl-${i}`} className="absolute text-[10px] text-slate-600 pointer-events-none"
              style={{ left: '-18px', top: `${(i * 5 / GRID) * 100}%` }}>{i * 5}</span>
          ))}

          <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible">

            {/* grid lines */}
            {Array.from({ length: GRID + 1 }).map((_, i) => (
              <line key={`gv${i}`} x1={i} y1="0" x2={i} y2={GRID} stroke="#1a202c" strokeWidth="0.05" />
            ))}
            {Array.from({ length: GRID + 1 }).map((_, i) => (
              <line key={`gh${i}`} x1="0" y1={i} x2={GRID} y2={i} stroke="#1a202c" strokeWidth="0.05" />
            ))}

            {/* obstacles — rendered below everything else */}
            {obstacles.map((o, i) => <ObstacleRect key={`obs-${i}`} o={o} />)}

            {/* target */}
            <motion.g animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.8 }}>
              <rect x={lvl.target.x + 0.1} y={lvl.target.y + 0.1} width={0.8} height={0.8}
                fill="none" stroke="#4ade80" strokeWidth="0.1" strokeDasharray="0.2,0.15" />
              <circle cx={lvl.target.x + 0.5} cy={lvl.target.y + 0.5} r="0.18"
                fill="#4ade80" fillOpacity="0.7" />
              <circle cx={lvl.target.x + 0.5} cy={lvl.target.y + 0.5} r="0.06"
                fill="#fff" />
            </motion.g>

            {/* laser origin */}
            <g>
              <rect x={lvl.laserOrigin.x + 0.1} y={lvl.laserOrigin.y + 0.1} width={0.8} height={0.8}
                fill="#1e0a0a" stroke="#f43f5e" strokeWidth="0.1" rx="0.1" />
              <circle cx={lvl.laserOrigin.x + 0.5} cy={lvl.laserOrigin.y + 0.5} r="0.2"
                fill="#f43f5e" fillOpacity="0.9" />
              <text x={lvl.laserOrigin.x + 0.5} y={lvl.laserOrigin.y + 0.56}
                textAnchor="middle" fontSize="0.3" fill="white" fontWeight="bold">
                {dirArrow(lvl.laserDir)}
              </text>
            </g>

            {/* placed mirrors */}
            {placedMirrors.map((m, i) => (
              <g key={i}>
                <rect x={m.x} y={m.y} width={1} height={1}
                  fill={hoveredMirror === i ? '#0f172a' : '#0a0f1a'}
                  stroke={hoveredMirror === i ? '#38bdf8' : '#1e293b'}
                  strokeWidth="0.07"
                  onMouseEnter={() => setHoveredMirror(i)}
                  onMouseLeave={() => setHoveredMirror(null)}
                />
                <MirrorShape x={m.x} y={m.y} angle={m.angle} highlight={hoveredMirror === i} />
                <text x={m.x + 0.5} y={m.y + 0.93}
                  textAnchor="middle" fontSize="0.22" fill="#475569">
                  {((m.angle % 360) + 360) % 360}°
                </text>
                <text x={m.x + 0.5} y={m.y + 0.25}
                  textAnchor="middle" fontSize="0.18" fill="#64748b">{i + 1}</text>
              </g>
            ))}

            {/* laser path */}
            <AnimatePresence>
              {laserPath && (
                <motion.g key={pathKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <LaserPath path={laserPath} color={beamColor} />
                  {/* dot at beam terminus */}
                  {laserPath.length > 0 && (
                    <motion.circle
                      cx={laserPath[laserPath.length - 1].x}
                      cy={laserPath[laserPath.length - 1].y}
                      r="0.25"
                      fill={beamColor}
                      fillOpacity="0.5"
                      initial={{ r: 0 }} animate={{ r: [0.15, 0.3, 0.15] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    />
                  )}
                </motion.g>
              )}
            </AnimatePresence>

            {/* flash overlays */}
            <AnimatePresence>
              {result === 'win' && (
                <motion.rect x={0} y={0} width={GRID} height={GRID} fill="#4ade80"
                  initial={{ opacity: 0.2 }} animate={{ opacity: 0 }} transition={{ duration: 1.2 }} />
              )}
              {result === 'miss' && (
                <motion.rect x={0} y={0} width={GRID} height={GRID} fill="#f43f5e"
                  initial={{ opacity: 0.1 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />
              )}
              {result === 'blocked' && (
                <motion.rect x={0} y={0} width={GRID} height={GRID} fill="#fb923c"
                  initial={{ opacity: 0.12 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />
              )}
            </AnimatePresence>
          </svg>

          {/* overlay cards */}
          <AnimatePresence>
            {showResult && result === 'win' && (
              <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900/95 border-2 border-emerald-500/60 rounded-2xl px-10 py-8 text-center shadow-2xl">
                  <div className="text-5xl mb-2">{attempts === 1 ? '🏆' : attempts === 2 ? '🎉' : '✓'}</div>
                  <div className="text-emerald-400 font-black text-lg uppercase tracking-widest mb-1">Beam on target!</div>
                  <div className="text-slate-500 text-xs">{attempts === 1 ? 'Perfect — first try!' : `${attempts} attempts`}</div>
                </div>
              </motion.div>
            )}
            {showResult && result === 'fail' && (
              <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900/95 border-2 border-red-500/60 rounded-2xl px-10 py-8 text-center shadow-2xl">
                  <div className="text-5xl mb-2">💥</div>
                  <div className="text-red-400 font-black text-lg uppercase tracking-widest mb-1">Out of attempts</div>
                  <div className="text-slate-500 text-xs">Reset and try again</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT: CONTROLS ────────────────────────────────────── */}
      <div className="w-full md:w-[420px] bg-slate-900 border-l border-white/10 p-5 flex flex-col overflow-hidden shadow-2xl">

        {/* header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-black text-rose-500 italic uppercase">ReflexGrid</h1>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Place Mirrors · Hit Target</p>
          </div>
          <button
            onClick={() => setScreen(source === 'community' ? 'community' : 'menu')}
            className="text-xs text-slate-500 hover:text-white uppercase font-bold">
            ← {source === 'community' ? 'Levels' : 'Menu'}
          </button>
        </div>

        {/* progress bar */}
        {source === 'builtin' && (
          <div className="flex gap-1.5 mb-4">
            {BUILTIN_LEVELS.map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i < levelIdx ? 'bg-emerald-500' : i === levelIdx ? 'bg-rose-400' : 'bg-slate-700'}`} />
            ))}
            <span className="text-[9px] text-slate-600 self-center ml-1">{levelIdx + 1}/{levels.length}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={`${source}-${levelIdx}`}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="flex-1 flex flex-col min-h-0 overflow-y-auto">

            {/* level info */}
            <div className="bg-black/40 p-3 rounded-xl border border-rose-500/20 mb-4 shrink-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{lvl.name}</span>
                <DiffBadge d={lvl.difficulty || 'easy'} />
              </div>
              {lvl.hint && <p className="text-[10px] text-slate-500 italic">{lvl.hint}</p>}
              <div className="flex gap-3 mt-2">
                <div className="text-[10px]">
                  <span className="text-slate-600">Laser: </span>
                  <span className="text-rose-400 font-bold">({lvl.laserOrigin.x},{lvl.laserOrigin.y}) {dirArrow(lvl.laserDir)}</span>
                </div>
                <div className="text-[10px]">
                  <span className="text-slate-600">Target: </span>
                  <span className="text-emerald-400 font-bold">({lvl.target.x},{lvl.target.y})</span>
                </div>
              </div>
              <div className="mt-1.5 text-[10px] text-slate-600">
                Max mirrors: <span className="text-sky-400 font-bold">{lvl.maxMirrors}</span>
                <span className="mx-2">·</span>
                Placed: <span className={`font-bold ${placedMirrors.length >= lvl.maxMirrors ? 'text-rose-400' : 'text-sky-400'}`}>
                  {placedMirrors.length}/{lvl.maxMirrors}
                </span>
              </div>

              {/* obstacle summary */}
              {obstacles.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/60">
                  <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest mb-1">
                    🧱 Obstacles ({obstacles.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {obstacles.map((o, i) => (
                      <span key={i} className="text-[9px] bg-slate-800/60 border border-slate-700/50 rounded px-1.5 py-0.5 text-slate-500 font-mono">
                        ({o.x},{o.y}) {o.w}×{o.h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add Mirror */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 mb-4 shrink-0">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                <span>🪞</span> Place New Mirror
                {canAddMirror && (
                  <span className="text-sky-400 text-[9px]">({lvl.maxMirrors - placedMirrors.length} left)</span>
                )}
              </p>

              {!canAddMirror ? (
                <div className="text-center py-3 text-slate-500 text-xs bg-slate-900/50 rounded-lg">
                  Maximum mirrors placed ({lvl.maxMirrors})
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-600 uppercase font-bold block mb-1">X (0–19)</label>
                      <input type="number" min="0" max="19"
                        value={newMirrorX}
                        onChange={e => setNewMirrorX(e.target.value)}
                        placeholder="X" disabled={isOver}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none transition-colors disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-600 uppercase font-bold block mb-1">Y (0–19)</label>
                      <input type="number" min="0" max="19"
                        value={newMirrorY}
                        onChange={e => setNewMirrorY(e.target.value)}
                        placeholder="Y" disabled={isOver}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-sky-500 focus:outline-none transition-colors disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-600 uppercase font-bold block mb-2">Angle</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 45, 90, 135].map(a => (
                        <button key={a} onClick={() => setNewMirrorAngle(a)} disabled={isOver}
                          className={`py-2 rounded-lg text-xs font-bold transition-all border ${newMirrorAngle === a ? 'bg-sky-600/30 border-sky-500/60 text-sky-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                          {a}°
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={addMirror}
                    disabled={isOver || !newMirrorX || !newMirrorY}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg font-bold text-sm uppercase transition-all flex items-center justify-center gap-2">
                    <span>+</span> Add Mirror at ({newMirrorX || '?'},{newMirrorY || '?'})
                  </button>
                </div>
              )}

              {placementError && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-red-400 text-[10px] text-center bg-red-500/10 border border-red-500/30 rounded-lg py-1.5">
                  ⚠️ {placementError}
                </motion.div>
              )}
            </div>

            {/* Placed mirrors list */}
            {placedMirrors.length > 0 && (
              <div className="mb-4 shrink-0">
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2">Placed Mirrors:</p>
                <div className="space-y-2">
                  {placedMirrors.map((m, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                      className={`p-3 rounded-xl border transition-all ${hoveredMirror === i ? 'border-sky-500/50 bg-sky-900/20' : 'border-slate-700/50 bg-slate-800/40'}`}
                      onMouseEnter={() => setHoveredMirror(i)}
                      onMouseLeave={() => setHoveredMirror(null)}>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-slate-700/60 rounded-lg flex items-center justify-center text-slate-400 text-xs font-black">{i + 1}</div>
                        <div className="flex-1">
                          <span className="text-sky-400 font-black text-xs">Mirror at ({m.x},{m.y})</span>
                        </div>
                        <button onClick={() => removeMirror(i)} disabled={isOver}
                          className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 rounded hover:bg-red-500/10 transition-colors disabled:opacity-30">
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {[0, 45, 90, 135].map(a => (
                          <button key={a} onClick={() => updateMirrorAngle(i, a)} disabled={isOver}
                            className={`flex-1 py-1 rounded text-[9px] font-bold transition-all border disabled:opacity-30 ${m.angle === a ? 'bg-sky-600/30 border-sky-500/60 text-sky-300' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                            {a}°
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* attempts bar */}
            <div className="flex gap-1.5 mb-4 shrink-0">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full ${
                  i < attempts
                    ? (result === 'win' && i === attempts - 1 ? 'bg-emerald-500' : 'bg-red-600/60')
                    : 'bg-slate-700'
                }`} />
              ))}
              <span className="text-[9px] text-slate-600 self-center ml-1">{attempts}/{MAX_ATTEMPTS}</span>
            </div>

            {/* status messages */}
            <AnimatePresence>
              {result === 'miss' && showResult && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center shrink-0">
                  <p className="text-red-400 font-black text-sm">Missed! Adjust positions or angles.</p>
                  <p className="text-slate-600 text-[10px] mt-1">{MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} left</p>
                </motion.div>
              )}
              {result === 'blocked' && showResult && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-3 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-center shrink-0">
                  <p className="text-orange-400 font-black text-sm">🧱 Beam hit an obstacle!</p>
                  <p className="text-slate-600 text-[10px] mt-1">Route around the walls. {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} left</p>
                </motion.div>
              )}
              {result === 'win' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="mb-3 bg-emerald-500/10 border border-emerald-500/50 rounded-xl p-3 text-center shrink-0">
                  <p className="text-emerald-400 font-black text-sm">🎯 Beam on target!</p>
                </motion.div>
              )}
              {result === 'fail' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="mb-3 bg-red-500/10 border border-red-500/40 rounded-xl p-3 text-center shrink-0">
                  <p className="text-red-400 font-black text-sm">💥 No attempts left</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* action buttons */}
            <div className="flex gap-2 shrink-0 mt-auto">
              {isOver ? (
                <>
                  <button onClick={restartLevel}
                    className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-black text-sm uppercase transition-all">
                    ↺ Retry
                  </button>
                  {result === 'win' && (
                    <motion.button onClick={nextLevel} whileTap={{ scale: 0.97 }}
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-sm uppercase transition-all">
                      Next →
                    </motion.button>
                  )}
                </>
              ) : (
                <>
                  <motion.button onClick={handleLaunch}
                    disabled={attempts >= MAX_ATTEMPTS || placedMirrors.length === 0}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-base uppercase transition-all shadow-lg">
                    🔴 Fire Laser
                  </motion.button>
                  <button onClick={restartLevel}
                    className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300 transition-all text-lg">
                    ↺
                  </button>
                </>
              )}
            </div>

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── DB ROW → LEVEL ─────────────────────────────────────────────────
function dbRowToLevel(row) {
  return {
    id: row.id,
    name: row.level_name || 'Community Level',
    difficulty: row.difficulty || 'medium',
    hint: row.hint || '',
    laserOrigin: { x: +row.laser_origin_x, y: +row.laser_origin_y },
    laserDir: row.laser_dir || 'E',
    target: { x: +row.target_x, y: +row.target_y },
    maxMirrors: row.max_mirrors || 3,
    // Community levels stored as JSON string or already-parsed array
    obstacles: row.obstacles
      ? (typeof row.obstacles === 'string' ? JSON.parse(row.obstacles) : row.obstacles)
      : [],
  };
}