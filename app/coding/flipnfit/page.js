'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, animate as fmAnimate } from 'framer-motion';

const GRID = 20;

// ── ANIMATION ──────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

function springTo(from, to, setter) {
  return new Promise(resolve => {
    fmAnimate(from, to, {
      type: 'spring',
      stiffness: 180,
      damping: 15,
      mass: 1.2,
      velocity: 0.5,
      onUpdate: v => setter(v),
      onComplete: resolve,
    });
  });
}

// ── COLLISION ──────────────────────────────────────────────────────
function getRectCorners(x, y, w, h, deg) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [[-w/2, -h/2], [w/2, -h/2], [w/2, h/2], [-w/2, h/2]];
  return corners.map(([lx, ly]) => ({
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  }));
}

function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function checkCollision(px, py, rotation, obstacles) {
  const w = 4;
  const h = 2;
  const margin = 0.1;
  const cx = px + w / 2;
  const cy = py + h / 2;
  const rad = (-rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return obstacles.some(o => {
    const corners = [
      { x: o.x, y: o.y }, { x: o.x + o.w, y: o.y },
      { x: o.x, y: o.y + o.h }, { x: o.x + o.w, y: o.y + o.h }
    ];
    for (let p of corners) {
      let dx = p.x - cx; let dy = p.y - cy;
      let localX = dx * cos - dy * sin;
      let localY = dx * sin + dy * cos;
      if (localX >= -(w/2 - margin) && localX <= (w/2 - margin) &&
          localY >= -(h/2 - margin) && localY <= (h/2 - margin)) return true;
    }
    const playerCorners = getRectCorners(px, py, w, h, rotation);
    for (let pc of playerCorners) {
      if (pc.x >= o.x && pc.x <= o.x + o.w && pc.y >= o.y && pc.y <= o.y + o.h) return true;
    }
    return false;
  });
}

// ── LEVELS ─────────────────────────────────────────────────────────
const LEVELS = [
  {
    hint: 'The tunnel is 3 units tall. Rotate the rect first, then slide through!',
    start: { x: 1, y: 9, rotation: 0 },
    target: { x: 15, y: 9, rotation: 0 },
    obstacles: [{ x: 7, y: 0, w: 1, h: 8.5 }, { x: 7, y: 11.5, w: 1, h: 8.5 }],
  },
  {
    hint: 'The tunnel is 3 units tall. Rotate the rect first, then slide through!',
    start: { x: 1, y: 9, rotation: 90 },
    target: { x: 12, y: 9, rotation: 0 },
    obstacles: [{ x: 7, y: 0, w: 1, h: 8.5 }, { x: 7, y: 11.5, w: 1, h: 8.5 }],
  },
  {
    hint: 'A wall blocks the way down. Rotate 90° then drop through the gap.',
    start: { x: 8, y: 1, rotation: 0 },
    target: { x: 8, y: 13, rotation: 90 },
    obstacles: [{ x: 0, y: 8, w: 8.5, h: 1 }, { x: 11.5, y: 8, w: 8.5, h: 1 }],
  },
  {
    hint: 'A wall blocks the way down. Rotate 90° then drop through the gap.',
    start: { x: 8, y: 1, rotation: 0 },
    target: { x: 10, y: 15, rotation: 90 },
    obstacles: [{ x: 0, y: 8, w: 10.5, h: 1 }, { x: 13.5, y: 8, w: 8.5, h: 1 }],
  },
  {
    hint: 'A wall blocks the way down. Rotate 90° then drop through the gap.',
    start: { x: 8, y: 1, rotation: 0 },
    target: { x: 10, y: 15, rotation: 0 },
    obstacles: [{ x: 0, y: 8, w: 10.5, h: 1 }, { x: 13.5, y: 8, w: 8.5, h: 1 }],
  },
  {
    hint: 'A wall blocks the way down. Rotate 90° then drop through the gap.',
    start: { x: 8, y: 1, rotation: 0 },
    target: { x: 1, y: 10, rotation: 0 },
    obstacles: [{ x: 0, y: 8, w: 10.5, h: 1 }, { x: 13.5, y: 8, w: 8.5, h: 1 }],
  },
  {
    hint: 'Two tunnels. Slide right flat, rotate, drop, rotate back, slide right.',
    start: { x: 1, y: 4, rotation: 0 },
    target: { x: 14, y: 14, rotation: 0 },
    obstacles: [
      { x: 7, y: 0, w: 1, h: 6.5 }, { x: 7, y: 9.5, w: 1, h: 4 }, { x: 12, y: 7, w: 1, h: 13 },
    ],
  },
  {
    hint: 'Navigate around the corner: go right, then rotate to fit, then go down.',
    start: { x: 1, y: 1, rotation: 0 },
    target: { x: 14, y: 13, rotation: 90 },
    obstacles: [{ x: 3, y: 7, w: 13, h: 1 }, { x: 13, y: 0, w: 1, h: 8 }, { x: 9, y: 12, w: 1, h: 8 }],
  },
 
];

const CMD_TYPES = ['x', 'y', 'rotation'];
const CMD_META = {
  x:        { label: 'translateX()', step: 1  },
  y:        { label: 'translateY()', step: 1  },
  rotation: { label: 'rotate()',     step: 15 },
};
const C = {
  x:        { text: 'text-blue-400',    border: 'border-blue-500/40',    hov: 'hover:bg-blue-600',    active: 'bg-blue-600',    dim: 'bg-blue-900/30'    },
  y:        { text: 'text-purple-400',  border: 'border-purple-500/40',  hov: 'hover:bg-purple-600',  active: 'bg-purple-600',  dim: 'bg-purple-900/30'  },
  rotation: { text: 'text-emerald-400', border: 'border-emerald-500/40', hov: 'hover:bg-emerald-600', active: 'bg-emerald-600', dim: 'bg-emerald-900/30' },
};

const POS_TOL = 1.2;
const ROT_TOL = 16;

function calcPoints(t) {
  if (t <= 1) return 10;
  if (t === 2) return 7;
  if (t === 3) return 5;
  if (t === 4) return 3;
  return 1;
}

export default function ObstacleCourse() {
  const [screen,    setScreen]    = useState('menu');
  const [levelIdx,  setLevelIdx]  = useState(0);
  const [commands,  setCommands]  = useState([]);
  const [dispX,     setDispX]     = useState(0);
  const [dispY,     setDispY]     = useState(0);
  const [dispRot,   setDispRot]   = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [collision, setCollision] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [tries,     setTries]     = useState(0);
  const [totalPts,  setTotalPts]  = useState(0);
  const [modal,     setModal]     = useState(null);

  const commandListRef = useRef(null);
  const lvl = LEVELS[levelIdx];

  useEffect(() => {
    if (commandListRef.current && commands.length > 0) {
      commandListRef.current.scrollTop = commandListRef.current.scrollHeight;
    }
  }, [commands.length]);

  function resetDisplay() { setDispX(0); setDispY(0); setDispRot(0); }

  function startGame() {
    setLevelIdx(0); setCommands([]); resetDisplay();
    setAttempted(false); setSuccess(false); setCollision(false);
    setTries(0); setTotalPts(0); setModal(null);
    setScreen('game');
  }

  function addCommand(type) {
    if (isRunning) return;
    setAttempted(false); setCollision(false);
    setCommands(prev => [...prev, { id: crypto.randomUUID(), type, value: 0 }]);
  }

  function setVal(id, v) {
    if (isRunning) return;
    setAttempted(false); setCollision(false);
    const num = parseFloat(v);
    setCommands(prev => prev.map(c => c.id === id ? { ...c, value: isNaN(num) ? 0 : num } : c));
  }

  function removeCommand(id) {
    if (isRunning) return;
    setCommands(prev => prev.filter(c => c.id !== id));
  }

  function reorderCommands(fromIndex, toIndex) {
    if (isRunning) return;
    setAttempted(false); setCollision(false);
    const reordered = Array.from(commands);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setCommands(reordered);
  }

  function resetLevel() {
    if (isRunning) return;
    setCommands([]); resetDisplay();
    setAttempted(false); setSuccess(false); setCollision(false);
    setTries(0);
  }

  function nextLevel() {
    const next = levelIdx + 1;
    if (next >= LEVELS.length) { setScreen('done'); }
    else {
      setLevelIdx(next); setCommands([]); resetDisplay();
      setAttempted(false); setSuccess(false); setCollision(false); setTries(0);
    }
  }

  // ── RUN ──────────────────────────────────────────────────────────
  async function handleRun() {
    if (isRunning || commands.length === 0) return;
    setIsRunning(true);
    setAttempted(false); setSuccess(false); setCollision(false);
    setDispX(0); setDispY(0); setDispRot(0);
    await delay(80);

    const { start, target, obstacles } = lvl;
    let cX = 0, cY = 0, cRot = 0;

    for (const cmd of commands) {
      const total = cmd.value || 0;
      if (total === 0) { await delay(200); continue; }

      if (cmd.type === 'x') {
        // ── Collision-check in fine steps BEFORE animating ──
        const substeps = Math.max(8, Math.ceil(Math.abs(total) * 4));
        const inc = total / substeps;
        let safeX = cX;
        let hitWall = false;
        for (let i = 1; i <= substeps; i++) {
          const testX = cX + inc * i;
          if (checkCollision(start.x + testX, start.y + cY, start.rotation + cRot, obstacles)) {
            hitWall = true; break;
          }
          safeX = testX;
        }
        // Animate the full spring from current → safe destination
        await springTo(cX, safeX, setDispX);
        cX = safeX;
        if (hitWall) {
          setCollision(true); setAttempted(true);
          await delay(500);
          await Promise.all([springTo(cX, 0, setDispX), springTo(cY, 0, setDispY), springTo(cRot, 0, setDispRot)]);
          setIsRunning(false); return;
        }

      } else if (cmd.type === 'y') {
        const substeps = Math.max(8, Math.ceil(Math.abs(total) * 4));
        const inc = total / substeps;
        let safeY = cY;
        let hitWall = false;
        for (let i = 1; i <= substeps; i++) {
          const testY = cY + inc * i;
          if (checkCollision(start.x + cX, start.y + testY, start.rotation + cRot, obstacles)) {
            hitWall = true; break;
          }
          safeY = testY;
        }
        await springTo(cY, safeY, setDispY);
        cY = safeY;
        if (hitWall) {
          setCollision(true); setAttempted(true);
          await delay(500);
          await Promise.all([springTo(cX, 0, setDispX), springTo(cY, 0, setDispY), springTo(cRot, 0, setDispRot)]);
          setIsRunning(false); return;
        }

      } else if (cmd.type === 'rotation') {
        const substeps = Math.max(8, Math.ceil(Math.abs(total) / 5));
        const inc = total / substeps;
        let safeRot = cRot;
        let hitWall = false;
        for (let i = 1; i <= substeps; i++) {
          const testRot = cRot + inc * i;
          if (checkCollision(start.x + cX, start.y + cY, start.rotation + testRot, obstacles)) {
            hitWall = true; break;
          }
          safeRot = testRot;
        }
        await springTo(cRot, safeRot, setDispRot);
        cRot = safeRot;
        if (hitWall) {
          setCollision(true); setAttempted(true);
          await delay(500);
          await Promise.all([springTo(cX, 0, setDispX), springTo(cY, 0, setDispY), springTo(cRot, 0, setDispRot)]);
          setIsRunning(false); return;
        }
      }

      // Pause between commands so each spring is visible
      await delay(380);
    }

    // ── WIN CHECK ────────────────────────────────────────────────
    const finalX   = start.x + cX;
    const finalY   = start.y + cY;
    const finalRot = start.rotation + cRot;

    const playerCorners = getRectCorners(finalX, finalY, 4, 2, finalRot);
    const targetCorners = getRectCorners(target.x, target.y, 4, 2, target.rotation);
    const tolerance = 0.35;
    let matchCount = 0;
    const usedIdx = new Set();
    for (let i = 0; i < 4; i++) {
      const pc = playerCorners[i];
      for (let j = 0; j < 4; j++) {
        if (usedIdx.has(j)) continue;
        const tc = targetCorners[j];
        if (Math.abs(pc.x - tc.x) < tolerance && Math.abs(pc.y - tc.y) < tolerance) {
          matchCount++; usedIdx.add(j); break;
        }
      }
    }
    const isWin = matchCount === 4;

    const thisTry = tries + 1;
    setTries(thisTry);
    setAttempted(true);

    if (isWin) {
      setSuccess(true);
      setDispX(target.x - start.x);
      setDispY(target.y - start.y);
      setDispRot(target.rotation - start.rotation);
      const pts = calcPoints(thisTry);
      setTotalPts(prev => prev + pts);
      setModal({ pts, tries: thisTry });
      await delay(1800);
      setModal(null);
      nextLevel();
    } else {
      await delay(500);
      await Promise.all([
        cX   !== 0 ? springTo(cX,   0, setDispX)   : Promise.resolve(),
        cY   !== 0 ? springTo(cY,   0, setDispY)   : Promise.resolve(),
        cRot !== 0 ? springTo(cRot, 0, setDispRot) : Promise.resolve(),
      ]);
    }

    setIsRunning(false);
  }

  // ── DERIVED ──────────────────────────────────────────────────────
  const { start, target, obstacles } = lvl;
  const playerX    = start.x + dispX;
  const playerY    = start.y + dispY;
  const playerRot  = start.rotation + dispRot;
  const playerCx   = playerX + 2;
  const playerCy   = playerY + 1;
  const targetCx   = target.x + 2;
  const targetCy   = target.y + 1;
  const playerXform = `rotate(${playerRot} ${playerCx} ${playerCy})`;
  const targetXform = `rotate(${target.rotation} ${targetCx} ${targetCy})`;

  // ── MENU ─────────────────────────────────────────────────────────
  if (screen === 'menu') {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center font-mono">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md w-full px-6">
          <h1 className="text-5xl font-black text-orange-500 italic uppercase mb-2">Flip & Fit!</h1>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">Navigate the shape around obstacles using the right sequence of transforms</p>
          <div className="bg-slate-900/50 rounded-2xl p-4 mb-4 border border-slate-800">
            <p className="text-slate-300 text-sm mb-3 font-bold">3 COMMANDS AVAILABLE:</p>
            <div className="space-y-3">
              <motion.div className="flex items-center gap-3 bg-blue-900/20 border border-blue-500/30 rounded-xl p-3"
                animate={{ x: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 font-bold">X</div>
                <div className="flex-1 text-left">
                  <span className="text-blue-400 font-black text-sm">translateX()</span>
                  <span className="text-slate-500 text-xs ml-2">← → left or right</span>
                </div>
                <motion.div className="w-6 h-3 bg-blue-500 rounded-sm"
                  animate={{ x: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} />
              </motion.div>
              <motion.div className="flex items-center gap-3 bg-purple-900/20 border border-purple-500/30 rounded-xl p-3"
                animate={{ y: [0, -5, 5, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', delay: 0.4 }}>
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 font-bold">Y</div>
                <div className="flex-1 text-left">
                  <span className="text-purple-400 font-black text-sm">translateY()</span>
                  <span className="text-slate-500 text-xs ml-2">↑ ↓ up or down</span>
                </div>
                <motion.div className="w-6 h-3 bg-purple-500 rounded-sm"
                  animate={{ y: [0, -5, 5, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', delay: 0.4 }} />
              </motion.div>
              <motion.div className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3"
                animate={{ rotate: [0, 30, -30, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.8 }}>
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 font-bold">↻</div>
                <div className="flex-1 text-left">
                  <span className="text-emerald-400 font-black text-sm">rotate()</span>
                  <span className="text-slate-500 text-xs ml-2">↻ ↺ clockwise or counter</span>
                </div>
                <motion.div className="w-6 h-3 bg-emerald-500 rounded-sm origin-center"
                  animate={{ rotate: [0, 45, -45, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.8 }} />
              </motion.div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800">
              <p className="text-slate-400 text-xs mb-2">Example sequence:</p>
              <div className="flex items-center justify-center gap-1 text-xs flex-wrap">
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">X+5</span>
                <span className="text-slate-600">→</span>
                <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Y-3</span>
                <span className="text-slate-600">→</span>
                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">Rot+90°</span>
                <span className="text-slate-600">→</span>
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">X-2</span>
              </div>
            </div>
          </div>
          <p className="text-slate-200 text-xs mb-6">
            <span className="text-yellow-400">⭐ Points per level:</span> 1st try=10 • 2nd=7 • 3rd=5 • 4th=3 • 5th+=1
          </p>
          <button onClick={startGame} className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1 shadow-lg mb-3">
            Start →
          </button>
          <p className="text-slate-700 text-[10px]">Drag commands to reorder them in-game</p>
        </motion.div>
      </div>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────
  if (screen === 'done') {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center font-mono">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-6 max-w-sm">
          <div className="text-8xl mb-4">🏅</div>
          <h1 className="text-5xl font-black text-emerald-400 italic uppercase mb-3">Cleared!</h1>
          <p className="text-slate-400 mb-2">All levels done!</p>
          <div className="text-4xl font-black text-yellow-400 mb-8">⭐ {totalPts} pts</div>
          <button onClick={startGame} className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1 mb-3">Play Again</button>
          <a href="/shape-match" className="block text-slate-600 hover:text-slate-400 text-sm font-bold uppercase">← Back to Shape Match</a>
        </motion.div>
      </div>
    );
  }

  // ── GAME ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col md:flex-row font-mono overflow-hidden">
      {/* ── LEFT: GRID ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 relative select-none">
        <div className="relative w-full aspect-square max-w-[550px] border-2 border-slate-800 bg-[#01040a]">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`xl-${i}`} className="absolute text-[10px] text-slate-600" style={{ left: `${(i*5/GRID)*100}%`, top: '-20px' }}>{i*5}</span>
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`yl-${i}`} className="absolute text-[10px] text-slate-600" style={{ left: '-20px', top: `${(i*5/GRID)*100}%` }}>{i*5}</span>
          ))}
          <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible">
            {Array.from({ length: GRID+1 }).map((_, i) => (
              <line key={`gv${i}`} x1={i} y1="0" x2={i} y2={GRID} stroke="#1a202c" strokeWidth="0.05" />
            ))}
            {Array.from({ length: GRID+1 }).map((_, i) => (
              <line key={`gh${i}`} x1="0" y1={i} x2={GRID} y2={i} stroke="#1a202c" strokeWidth="0.05" />
            ))}
            {obstacles.map((o, i) => (
              <rect key={i} x={o.x} y={o.y} width={o.w} height={o.h} fill="#334155" stroke="#475569" strokeWidth="0.1" />
            ))}
            <rect x={target.x} y={target.y} width={4} height={2} fill="none"
              stroke="#4ADE80" strokeWidth="0.25" strokeDasharray="0.5,0.4" opacity={0.6} transform={targetXform} />
            <rect x={playerX} y={playerY} width={4} height={2}
              fill={collision ? '#EF4444' : success ? '#4ADE80' : '#F97316'}
              stroke={collision ? '#FCA5A5' : success ? '#fff' : 'none'}
              strokeWidth={0.2} transform={playerXform}
              style={{ filter: collision ? 'drop-shadow(0 0 4px rgba(239,68,68,0.8))' : success ? 'drop-shadow(0 0 6px rgba(74,222,128,0.7))' : 'none' }}
            />
            {success && (
              <motion.rect x="0" y="0" width={GRID} height={GRID} fill="#4ADE80"
                initial={{ opacity: 0.15 }} animate={{ opacity: 0 }} transition={{ duration: 1.2 }} />
            )}
            {collision && (
              <motion.rect x="0" y="0" width={GRID} height={GRID} fill="#EF4444"
                initial={{ opacity: 0.12 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />
            )}
          </svg>
          <AnimatePresence>
            {modal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-slate-900/95 border-2 border-emerald-500/60 rounded-2xl px-10 py-8 text-center shadow-2xl">
                  <div className="text-5xl mb-2">{modal.pts === 10 ? '🏆' : modal.pts >= 7 ? '🎉' : modal.pts >= 5 ? '👍' : '✓'}</div>
                  <div className="text-emerald-400 font-black text-lg uppercase tracking-widest mb-1">Cleared!</div>
                  <div className="text-6xl font-black text-yellow-400 my-2">+{modal.pts}</div>
                  <div className="text-slate-500 text-xs uppercase tracking-widest">
                    {modal.tries === 1 ? 'First try!' : modal.tries === 2 ? '2nd attempt' : modal.tries === 3 ? '3rd attempt' : `${modal.tries} attempts`}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT: CONTROLS ── */}
      <div className="w-full md:w-[400px] bg-slate-900 border-l border-white/10 p-5 flex flex-col overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-black text-orange-500 italic uppercase">Flip & Fit!</h1>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 border border-yellow-500/40 px-3 py-1 rounded-lg">
              <span className="text-yellow-400 font-black text-sm">⭐ {totalPts} pts</span>
            </div>
            <button onClick={() => setScreen('menu')} className="text-xs text-slate-500 hover:text-white uppercase font-bold">← Menu</button>
          </div>
        </div>
        <div className="flex gap-1.5 mb-4">
          {LEVELS.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i < levelIdx ? 'bg-emerald-500' : i === levelIdx ? 'bg-orange-400' : 'bg-slate-700'}`} />
          ))}
          <span className="text-[9px] text-slate-600 self-center ml-1">{levelIdx+1}/{LEVELS.length}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={levelIdx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex-1 flex flex-col min-h-0">
            <div className="bg-black/40 p-3 rounded-xl border border-orange-500/20 mb-3 flex-shrink-0">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Level {levelIdx+1}</span>
     
            </div>
            <div className="flex gap-4 mb-3 flex-shrink-0">
              <div className="flex items-center gap-1.5"><div className="w-4 h-2 rounded-sm bg-orange-500" /><span className="text-[10px] text-slate-500">your rect</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 border border-dashed border-emerald-400 opacity-60" /><span className="text-[10px] text-slate-500">target</span></div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-2 rounded-sm bg-slate-500" /><span className="text-[10px] text-slate-500">obstacle</span></div>
            </div>
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2 flex-shrink-0">Commands:</p>
            <div className="grid grid-cols-3 gap-1.5 mb-3 flex-shrink-0">
              {CMD_TYPES.map(type => {
                const meta = CMD_META[type]; const col = C[type];
                return (
                  <button key={type} onClick={() => addCommand(type)} disabled={isRunning}
                    className={`py-2.5 rounded-lg font-black text-[10px] uppercase transition-all border disabled:opacity-30 bg-slate-800 ${col.text} ${col.border} hover:bg-slate-700`}>
                    + {meta.label}
                  </button>
                );
              })}
            </div>
            <div ref={commandListRef} className="flex-1 overflow-y-auto min-h-0 space-y-1.5 mb-3">
              {commands.length === 0 ? (
                <div className="text-center py-8 text-slate-300 italic text-xs border border-dashed border-slate-800 rounded-xl">Add commands in order, then hit Run ▶</div>
              ) : (
                <AnimatePresence initial={false}>
                  {commands.map((cmd, idx) => {
                    const meta = CMD_META[cmd.type]; const col = C[cmd.type];
                    return (
                      <motion.div key={cmd.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                        layout drag="y" dragSnapToOrigin={true}
                        onDragEnd={(_, info) => {
                          const ITEM_HEIGHT = 48;
                          const moveBy = Math.round(info.offset.y / ITEM_HEIGHT);
                          const newIndex = Math.max(0, Math.min(commands.length - 1, idx + moveBy));
                          if (newIndex !== idx) reorderCommands(idx, newIndex);
                        }}
                        whileDrag={{ scale: 1.04, opacity: 0.85, zIndex: 50, boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
                        className={`p-2.5 rounded-xl border ${col.border} ${col.dim} flex items-center gap-2 cursor-grab active:cursor-grabbing`}
                      >
                        <div className="text-slate-600 text-[9px] font-black w-4 text-right shrink-0 flex items-center justify-center">
                          <span className="text-xs mr-1 opacity-50">⋮⋮</span>{idx+1}
                        </div>
                        <span className={`text-[10px] font-black ${col.text} flex-1 truncate`}>{meta.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setVal(cmd.id, cmd.value - meta.step)} disabled={isRunning}
                            className={`bg-slate-700 ${col.hov} text-white font-black w-7 h-7 rounded flex items-center justify-center transition-all disabled:opacity-30 text-sm`}>−</button>
                          <input type="number" value={cmd.value} onChange={e => setVal(cmd.id, e.target.value)} disabled={isRunning}
                            className={`w-12 bg-slate-900 font-black text-sm outline-none ${col.text} text-center rounded py-1 border ${col.border} disabled:opacity-40`} />
                          <button onClick={() => setVal(cmd.id, cmd.value + meta.step)} disabled={isRunning}
                            className={`bg-slate-700 ${col.hov} text-white font-black w-7 h-7 rounded flex items-center justify-center transition-all disabled:opacity-30 text-sm`}>+</button>
                        </div>
                        <button onClick={() => removeCommand(cmd.id)} disabled={isRunning} className="text-slate-600 hover:text-red-400 disabled:opacity-30 text-xs px-1">✕</button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
            <AnimatePresence>
              {collision && !isRunning && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-3 bg-red-500/10 border border-red-500/40 rounded-xl p-3 text-center flex-shrink-0">
                  <p className="text-red-400 font-black text-sm">💥 Hit a wall! Fix your sequence</p>
                  <p className="text-slate-600 text-[10px] mt-1">try rotating before translating</p>
                </motion.div>
              )}
              {attempted && !collision && !success && !isRunning && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center flex-shrink-0">
                  <p className="text-red-400 font-black text-sm">Didn't reach the target</p>
                  <p className="text-slate-600 text-[10px] mt-1">attempt {tries} · next correct = {calcPoints(tries + 1)} pts</p>
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="mb-3 bg-emerald-500/10 border border-emerald-500/50 rounded-xl p-3 text-center flex-shrink-0">
                  <p className="text-emerald-400 font-black text-lg">✓ Course cleared!</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex gap-2 flex-shrink-0">
              <motion.button onClick={handleRun} disabled={isRunning || commands.length === 0} whileTap={{ scale: 0.97 }}
                className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-base uppercase transition-all shadow-lg">
                {isRunning ? '⏳ Running...' : '▶  Run'}
              </motion.button>
              <button onClick={resetLevel} disabled={isRunning}
                className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl font-bold text-slate-300 transition-all text-lg">↺</button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}