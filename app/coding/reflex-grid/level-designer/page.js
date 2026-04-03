'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GRID = 20;
const DIRS = ['E', 'W', 'N', 'S'];
const DIR_ARROW = { E: '→', W: '←', N: '↑', S: '↓' };
const DIFFICULTIES = ['easy', 'medium', 'hard'];

// reuse laser physics from main game
const DIR_VEC = { E: { dx: 1, dy: 0 }, W: { dx: -1, dy: 0 }, N: { dx: 0, dy: -1 }, S: { dx: 0, dy: 1 } };

function reflectDir(dx, dy, mirrorAngle) {
  const a = ((mirrorAngle % 180) + 180) % 180;
  if (a === 0)   return { dx: -dx, dy };
  if (a === 90)  return { dx, dy: -dy };
  if (a === 45)  return { dx: -dy, dy: -dx };
  if (a === 135) return { dx: dy, dy: dx };
  return { dx, dy };
}

function shootLaser(origin, dirKey, mirrors, target) {
  const path = [{ x: origin.x + 0.5, y: origin.y + 0.5 }];
  let { dx, dy } = DIR_VEC[dirKey];
  let cx = origin.x + 0.5 + dx * 0.5;
  let cy = origin.y + 0.5 + dy * 0.5;
  const MAX_STEPS = 200;
  let steps = 0;
  while (steps++ < MAX_STEPS) {
    if (cx < 0 || cx > GRID || cy < 0 || cy > GRID) { path.push({ x: cx, y: cy }); break; }
    const cellX = Math.floor(cx - dx * 0.001);
    const cellY = Math.floor(cy - dy * 0.001);
    if (target && cellX === target.x && cellY === target.y) { path.push({ x: cx, y: cy }); break; }
    const mirror = mirrors.find(m => m.x === cellX && m.y === cellY);
    if (mirror) {
      const mcx = cellX + 0.5, mcy = cellY + 0.5;
      path.push({ x: mcx, y: mcy });
      const ref = reflectDir(dx, dy, mirror.angle);
      dx = ref.dx; dy = ref.dy;
      cx = mcx + dx * 0.5; cy = mcy + dy * 0.5;
      continue;
    }
    cx += dx; cy += dy;
    path.push({ x: cx, y: cy });
  }
  return path;
}

function MirrorShape({ x, y, angle }) {
  const cx = x + 0.5, cy = y + 0.5;
  const rad = (angle * Math.PI) / 180;
  const len = 0.38;
  return (
    <line
      x1={cx - Math.cos(rad) * len} y1={cy - Math.sin(rad) * len}
      x2={cx + Math.cos(rad) * len} y2={cy + Math.sin(rad) * len}
      stroke="#94a3b8" strokeWidth="0.14" strokeLinecap="round"
    />
  );
}

export default function LevelDesigner() {
  const [tool, setTool] = useState('mirror'); // 'mirror' | 'laser' | 'target' | 'erase'
  const [mirrors, setMirrors] = useState([]);
  const [laserOrigin, setLaserOrigin] = useState(null);
  const [laserDir, setLaserDir] = useState('E');
  const [target, setTarget] = useState(null);
  const [laserPath, setLaserPath] = useState(null);
  const [preview, setPreview] = useState(false);

  // save form
  const [levelName, setLevelName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [hint, setHint] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  function handleGridClick(gx, gy) {
    if (tool === 'mirror') {
      const existing = mirrors.findIndex(m => m.x === gx && m.y === gy);
      if (existing >= 0) {
        // cycle angle
        setMirrors(prev => prev.map((m, i) => i === existing ? { ...m, angle: (m.angle + 45) % 180 } : m));
      } else {
        // don't place mirror on origin or target
        if (laserOrigin && laserOrigin.x === gx && laserOrigin.y === gy) return;
        if (target && target.x === gx && target.y === gy) return;
        setMirrors(prev => [...prev, { x: gx, y: gy, angle: 0 }]);
      }
    } else if (tool === 'laser') {
      if (mirrors.some(m => m.x === gx && m.y === gy)) return;
      if (target && target.x === gx && target.y === gy) return;
      setLaserOrigin({ x: gx, y: gy });
    } else if (tool === 'target') {
      if (mirrors.some(m => m.x === gx && m.y === gy)) return;
      if (laserOrigin && laserOrigin.x === gx && laserOrigin.y === gy) return;
      setTarget({ x: gx, y: gy });
    } else if (tool === 'erase') {
      setMirrors(prev => prev.filter(m => !(m.x === gx && m.y === gy)));
      if (laserOrigin && laserOrigin.x === gx && laserOrigin.y === gy) setLaserOrigin(null);
      if (target && target.x === gx && target.y === gy) setTarget(null);
    }
    setLaserPath(null);
    setPreview(false);
  }

  function handlePreview() {
    if (!laserOrigin || mirrors.length === 0) return;
    const path = shootLaser(laserOrigin, laserDir, mirrors, target);
    setLaserPath(path);
    setPreview(true);
  }

  async function handleSave() {
    if (!levelName.trim() || !creatorName.trim() || !laserOrigin || !target || mirrors.length === 0) return;
    setSaving(true); setSaveError('');
    const { error } = await supabase.from('reflex_grid_levels').insert({
      level_name: levelName.trim(),
      creator_name: creatorName.trim(),
      hint: hint.trim(),
      difficulty,
      laser_origin_x: laserOrigin.x,
      laser_origin_y: laserOrigin.y,
      laser_dir: laserDir,
      mirrors: mirrors,
      target_x: target.x,
      target_y: target.y,
    });
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function resetAll() {
    setMirrors([]); setLaserOrigin(null); setTarget(null);
    setLaserPath(null); setPreview(false);
  }

  const canSave = levelName.trim() && creatorName.trim() && laserOrigin && target && mirrors.length > 0;
  const TOOLS = [
    { id: 'mirror', label: '🪞 Mirror', color: 'sky' },
    { id: 'laser',  label: '🔴 Laser',  color: 'rose' },
    { id: 'target', label: '🎯 Target', color: 'emerald' },
    { id: 'erase',  label: '🗑 Erase',  color: 'slate' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col md:flex-row font-mono overflow-hidden">
      {/* LEFT: GRID */}
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 relative select-none">
        <div className="relative w-full aspect-square max-w-[560px] border-2 border-slate-800 bg-[#01040a]">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`xl-${i}`} className="absolute text-[10px] text-slate-600 pointer-events-none" style={{ left: `${(i * 5 / GRID) * 100}%`, top: '-18px' }}>{i * 5}</span>
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`yl-${i}`} className="absolute text-[10px] text-slate-600 pointer-events-none" style={{ left: '-18px', top: `${(i * 5 / GRID) * 100}%` }}>{i * 5}</span>
          ))}

          <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible"
            style={{ cursor: tool === 'erase' ? 'cell' : 'crosshair' }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const sx = (e.clientX - rect.left) / rect.width * GRID;
              const sy = (e.clientY - rect.top) / rect.height * GRID;
              handleGridClick(Math.floor(sx), Math.floor(sy));
            }}>

            {Array.from({ length: GRID + 1 }).map((_, i) => (
              <line key={`gv${i}`} x1={i} y1="0" x2={i} y2={GRID} stroke="#1a202c" strokeWidth="0.05" />
            ))}
            {Array.from({ length: GRID + 1 }).map((_, i) => (
              <line key={`gh${i}`} x1="0" y1={i} x2={GRID} y2={i} stroke="#1a202c" strokeWidth="0.05" />
            ))}

            {/* target */}
            {target && (
              <g>
                <rect x={target.x + 0.1} y={target.y + 0.1} width={0.8} height={0.8}
                  fill="none" stroke="#4ade80" strokeWidth="0.1" strokeDasharray="0.2,0.15" />
                <circle cx={target.x + 0.5} cy={target.y + 0.5} r="0.18" fill="#4ade80" fillOpacity="0.7" />
                <circle cx={target.x + 0.5} cy={target.y + 0.5} r="0.06" fill="#fff" />
              </g>
            )}

            {/* laser origin */}
            {laserOrigin && (
              <g>
                <rect x={laserOrigin.x + 0.1} y={laserOrigin.y + 0.1} width={0.8} height={0.8}
                  fill="#1e0a0a" stroke="#f43f5e" strokeWidth="0.1" rx="0.1" />
                <circle cx={laserOrigin.x + 0.5} cy={laserOrigin.y + 0.5} r="0.2" fill="#f43f5e" fillOpacity="0.9" />
                <text x={laserOrigin.x + 0.5} y={laserOrigin.y + 0.56} textAnchor="middle" fontSize="0.3" fill="white" fontWeight="bold">
                  {DIR_ARROW[laserDir]}
                </text>
              </g>
            )}

            {/* mirrors */}
            {mirrors.map((m, i) => (
              <g key={i}>
                <rect x={m.x} y={m.y} width={1} height={1} fill="#0a0f1a" stroke="#1e293b" strokeWidth="0.07" />
                <MirrorShape x={m.x} y={m.y} angle={m.angle} />
                <text x={m.x + 0.5} y={m.y + 0.93} textAnchor="middle" fontSize="0.22" fill="#475569">
                  {((m.angle % 360) + 360) % 360}°
                </text>
              </g>
            ))}

            {/* laser preview */}
            {laserPath && (
              <g>
                {laserPath.map((p, i) => i > 0 && (
                  <line key={i}
                    x1={laserPath[i - 1].x} y1={laserPath[i - 1].y}
                    x2={p.x} y2={p.y}
                    stroke="#f43f5e" strokeWidth="0.1" strokeOpacity="0.7"
                    style={{ filter: 'drop-shadow(0 0 0.3px #f43f5e)' }}
                  />
                ))}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* RIGHT: CONTROLS */}
      <div className="w-full md:w-[380px] bg-slate-900 border-l border-white/10 p-5 flex flex-col gap-4 overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-rose-500 italic uppercase">ReflexGrid</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Level Designer</p>
          </div>
          <a href="/" className="text-xs text-slate-500 hover:text-white uppercase font-bold">← Play</a>
        </div>

        {/* tools */}
        <div>
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2">Tool</p>
          <div className="grid grid-cols-2 gap-1.5">
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => setTool(t.id)}
                className={`py-2.5 rounded-lg font-black text-xs uppercase transition-all border ${
                  tool === t.id
                    ? 'bg-slate-700 border-slate-500 text-white'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-500 hover:text-slate-300'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2 italic">
            {tool === 'mirror' && 'Click empty cell to place mirror. Click mirror again to rotate 45°.'}
            {tool === 'laser'  && 'Click a cell to set the laser origin.'}
            {tool === 'target' && 'Click a cell to place the target.'}
            {tool === 'erase'  && 'Click any element to remove it.'}
          </p>
        </div>

        {/* laser direction */}
        <div>
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2">Laser Direction</p>
          <div className="grid grid-cols-4 gap-1.5">
            {DIRS.map(d => (
              <button key={d} onClick={() => setLaserDir(d)}
                className={`py-2 rounded-lg font-black text-sm transition-all border ${
                  laserDir === d ? 'bg-rose-600/30 border-rose-500/60 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}>
                {DIR_ARROW[d]}
              </button>
            ))}
          </div>
        </div>

        {/* current state */}
        <div className="bg-black/40 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2">Level State</p>
          <div className="flex justify-between">
            <span className="text-slate-600">Laser origin:</span>
            <span className={laserOrigin ? 'text-rose-400 font-bold' : 'text-slate-700'}>
              {laserOrigin ? `(${laserOrigin.x},${laserOrigin.y}) ${DIR_ARROW[laserDir]}` : 'not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Target:</span>
            <span className={target ? 'text-emerald-400 font-bold' : 'text-slate-700'}>
              {target ? `(${target.x},${target.y})` : 'not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Mirrors:</span>
            <span className={mirrors.length > 0 ? 'text-sky-400 font-bold' : 'text-slate-700'}>
              {mirrors.length > 0 ? mirrors.map(m => `(${m.x},${m.y})@${m.angle}°`).join(', ') : 'none'}
            </span>
          </div>
        </div>

        {/* preview */}
        <div className="flex gap-2">
          <button onClick={handlePreview} disabled={!laserOrigin || mirrors.length === 0}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 rounded-xl font-black text-xs uppercase text-slate-300 transition-all">
            👁 Preview Laser
          </button>
          <button onClick={() => { setLaserPath(null); setPreview(false); }}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold text-slate-500 transition-all text-sm">✕</button>
        </div>

        {/* save form */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Save to Community</p>

          <input value={levelName} onChange={e => setLevelName(e.target.value)} placeholder="Level name…" maxLength={40}
            className="w-full bg-slate-800 border border-slate-700 focus:border-rose-500/60 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 font-bold" />
          <input value={creatorName} onChange={e => setCreatorName(e.target.value)} placeholder="Your name…" maxLength={24}
            className="w-full bg-slate-800 border border-slate-700 focus:border-rose-500/60 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 font-bold" />
          <input value={hint} onChange={e => setHint(e.target.value)} placeholder="Hint for players… (optional)" maxLength={120}
            className="w-full bg-slate-800 border border-slate-700 focus:border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600" />

          <div>
            <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest mb-1.5">Difficulty</p>
            <div className="grid grid-cols-3 gap-1.5">
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`py-2 rounded-lg font-black text-[10px] uppercase transition-all border ${
                    difficulty === d ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800/60 border-slate-700/50 text-slate-500'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {saveError && <p className="text-red-400 text-xs">⚠ {saveError}</p>}

          <button onClick={handleSave} disabled={saving || !canSave || saved}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-sm uppercase transition-all">
            {saving ? '⏳ Saving…' : saved ? '✓ Saved!' : '💾 Save Level'}
          </button>
          <button onClick={resetAll} className="w-full py-2 text-slate-600 hover:text-slate-400 font-bold text-xs uppercase transition-colors">
            🗑 Clear All
          </button>
        </div>
      </div>
    </div>
  );
}