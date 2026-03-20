'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GRID = 20;
const FUNKY_COLORS = [
  '#FF0055', '#FF5500', '#FFCC00', '#AAFF00', '#00FF55',
  '#00FFCC', '#00AAFF', '#0055FF', '#5500FF', '#CC00FF',
  '#FF00CC', '#FF77AA', '#77FFAA', '#77CCFF', '#CCBBFF',
 '#4ADE80', '#F43F5E', '#FACC15','#FFFFFF',  '#000000', 
];

const CHALLENGES = {
  house: [
    { id: "1", type: "rect",    color: "#0055FF", rotation: 0, params: { x: 12, y: 10, w: 1, h: 1 } },
    { id: "2", type: "rect",    color: "#5500FF", rotation: 0, params: { x: 7,  y: 10, w: 1, h: 1 } },
    { id: "3", type: "rect",    color: "#FFFFFF", rotation: 0, params: { x: 10, y: 12, w: 1, h: 2 } },
    { id: "4", type: "rect",    color: "#FACC15", rotation: 0, params: { x: 6,  y: 9,  w: 8, h: 5 } },
    { id: "5", type: "polygon", color: "#FF0055", rotation: 0, params: { p1x: 4, p1y: 9, p2x: 10, p2y: 5, p3x: 16, p3y: 9 } }
  ],
  fish: [
    { id: "1", type: "circle",  color: "#FF00CC", rotation: 0, params: { cx: 4, cy: 10, r: 1 } },
    { id: "2", type: "polygon", color: "#00AAFF", rotation: 0, params: { p1x: 16, p1y: 10, p2x: 19, p2y: 5,  p3x: 19, p3y: 15 } },
    { id: "3", type: "polygon", color: "#00AAFF", rotation: 0, params: { p1x: 9,  p1y: 15, p2x: 5,  p2y: 10, p3x: 8,  p3y: 10 } },
    { id: "4", type: "polygon", color: "#00AAFF", rotation: 0, params: { p1x: 7,  p1y: 9,  p2x: 10, p2y: 5,  p3x: 10, p3y: 9  } },
    { id: "5", type: "ellipse", color: "#00AAFF", rotation: 0, params: { x: 1, y: 8, w: 18, h: 4 } }
  ],
  flower: [
    { id: "1", type: "circle",  color: "#FACC15", rotation: 0,   params: { cx: 10, cy: 10, r: 2 } },
    { id: "2", type: "line",    color: "#AAFF00", rotation: 0,   params: { x1: 10, y1: 23, x2: 10, y2: 10 } },
    { id: "3", type: "ellipse", color: "#FF77AA", rotation: 0,   params: { x: 11, y: 8, w: 8, h: 4 } },
    { id: "4", type: "ellipse", color: "#FF77AA", rotation: 135, params: { x: 9,  y: 2, w: 8, h: 4 } },
    { id: "5", type: "ellipse", color: "#FF77AA", rotation: 90,  params: { x: 6,  y: 1, w: 8, h: 4 } },
    { id: "6", type: "ellipse", color: "#FF77AA", rotation: 45,  params: { x: 3,  y: 2, w: 8, h: 4 } },
    { id: "7", type: "ellipse", color: "#FF77AA", rotation: 0,   params: { x: 1,  y: 8, w: 8, h: 4 } }
  ]
};

// ── HELPERS ───────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── SHAPE RENDERER ────────────────────────────────────────────────
function ShapeRenderer({ s, isSelected, isHitbox, isOutline }) {
  const props = {
    fill:            isOutline ? 'none'        : (isHitbox ? 'transparent' : s.color),
    stroke:          isOutline ? '#4ADE80'     : (isHitbox ? 'transparent' : (isSelected ? 'white' : 'none')),
    strokeWidth:     isOutline ? 0.3           : (isHitbox ? 1 : 0.2),
    strokeDasharray: isOutline ? '0.5,0.5'    : undefined,
    className:       isSelected && !isHitbox && !isOutline ? 'animate-pulse' : '',
    style:           { pointerEvents: isHitbox ? 'auto' : 'none' },
    opacity:         isOutline ? 0.6 : 1,
  };

  let cx = 0, cy = 0;
  if      (s.type === 'circle')  { cx = s.params.cx; cy = s.params.cy; }
  else if (s.type === 'rect')    { cx = s.params.x + s.params.w / 2; cy = s.params.y + s.params.h / 2; }
  else if (s.type === 'ellipse') { cx = s.params.x + s.params.w / 2; cy = s.params.y + s.params.h / 2; }
  else if (s.type === 'line')    { cx = (s.params.x1 + s.params.x2) / 2; cy = (s.params.y1 + s.params.y2) / 2; }
  else if (s.type === 'polygon') { cx = (s.params.p1x + s.params.p2x + s.params.p3x) / 3; cy = (s.params.p1y + s.params.p2y + s.params.p3y) / 3; }

  const transform = s.rotation ? `rotate(${s.rotation} ${cx} ${cy})` : undefined;

  if (s.type === 'circle')  return <circle cx={s.params.cx} cy={s.params.cy} r={s.params.r} transform={transform} {...props} />;
  if (s.type === 'rect')    return <rect x={s.params.x} y={s.params.y} width={s.params.w} height={s.params.h} transform={transform} {...props} />;
  if (s.type === 'ellipse') {
    const ecx = s.params.x + s.params.w / 2, ecy = s.params.y + s.params.h / 2;
    return <ellipse cx={ecx} cy={ecy} rx={s.params.w / 2} ry={s.params.h / 2} transform={transform} {...props} />;
  }
  if (s.type === 'line')    return <line x1={s.params.x1} y1={s.params.y1} x2={s.params.x2} y2={s.params.y2} transform={transform} {...props} stroke={isOutline ? '#4ADE80' : (isHitbox ? 'transparent' : s.color)} strokeWidth={isOutline ? 0.3 : (isHitbox ? 1 : 0.5)} strokeLinecap="round" />;
  if (s.type === 'polygon') return <polygon points={`${s.params.p1x},${s.params.p1y} ${s.params.p2x},${s.params.p2y} ${s.params.p3x},${s.params.p3y}`} transform={transform} {...props} />;
  return null;
}

// ── POINT LABELS ──────────────────────────────────────────────────
function PointLabels({ s, isSelected }) {
  if (!isSelected) return null;
  if (s.type === 'line') return (
    <>
      <circle cx={s.params.x1} cy={s.params.y1} r="0.3" fill="white" />
      <text x={s.params.x1} y={s.params.y1 - 0.5} fontSize="0.8" fill="white" textAnchor="middle" fontWeight="bold">1</text>
      <circle cx={s.params.x2} cy={s.params.y2} r="0.3" fill="white" />
      <text x={s.params.x2} y={s.params.y2 - 0.5} fontSize="0.8" fill="white" textAnchor="middle" fontWeight="bold">2</text>
    </>
  );
  if (s.type === 'polygon') return (
    <>
      <circle cx={s.params.p1x} cy={s.params.p1y} r="0.3" fill="white" />
      <text x={s.params.p1x} y={s.params.p1y - 0.5} fontSize="0.8" fill="white" textAnchor="middle" fontWeight="bold">1</text>
      <circle cx={s.params.p2x} cy={s.params.p2y} r="0.3" fill="white" />
      <text x={s.params.p2x} y={s.params.p2y - 0.5} fontSize="0.8" fill="white" textAnchor="middle" fontWeight="bold">2</text>
      <circle cx={s.params.p3x} cy={s.params.p3y} r="0.3" fill="white" />
      <text x={s.params.p3x} y={s.params.p3y - 0.5} fontSize="0.8" fill="white" textAnchor="middle" fontWeight="bold">3</text>
    </>
  );
  return null;
}

// ── MINI SVG PREVIEW ──────────────────────────────────────────────
function DrawingPreview({ shapes, className = '' }) {
  return (
    <svg viewBox="0 0 20 20" className={`bg-[#01040a] rounded-lg ${className}`}>
      {[...shapes].reverse().map(s => (
        <ShapeRenderer key={s.id} s={s} />
      ))}
    </svg>
  );
}

// ── MY LIBRARY MODAL ──────────────────────────────────────────────
function LibraryModal({ onClose, onEdit }) {
  const [drawings, setDrawings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [deleting, setDeleting] = useState(null);   // id being deleted
  const [confirmDelete, setConfirmDelete] = useState(null); // id pending confirm

  const fetchDrawings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drawings')
      .select('id, name, creator_name, shape_data, created_at')
      .eq('shape_type', 'composite')
      .order('created_at', { ascending: false });
    if (!error) setDrawings(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDrawings(); }, [fetchDrawings]);

  async function handleDelete(id) {
    setDeleting(id);
    await supabase.from('drawings').delete().eq('id', id);
    setDrawings(prev => prev.filter(d => d.id !== id));
    setDeleting(null);
    setConfirmDelete(null);
  }

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdrop}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 12 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{   scale: 0.93, opacity: 0, y: 12  }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl font-mono overflow-hidden"
      >
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full border border-pink-500/30 bg-pink-500/10 mb-1">
              <span className="text-pink-400 font-black text-[10px] uppercase tracking-widest">📚 My Library</span>
            </div>
            <h2 className="text-lg font-black text-white leading-tight">Saved Drawings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-xl font-black w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-all"
          >✕</button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm italic">Loading your drawings…</p>
            </div>
          ) : drawings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="text-5xl">🎨</div>
              <p className="text-slate-400 font-black text-base uppercase">Nothing saved yet</p>
              <p className="text-slate-600 text-xs italic">Go to Free Draw Mode and save your first drawing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {drawings.map(d => {
                const shapes = d.shape_data?.shapes || [];
                const isConfirming = confirmDelete === d.id;
                const isDeleting   = deleting === d.id;
                return (
                  <motion.div
                    key={d.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-slate-800/50 border border-slate-700 hover:border-slate-500 rounded-xl overflow-hidden transition-colors group"
                  >
                    {/* preview */}
                    <div className="p-3 pb-0">
                      <DrawingPreview shapes={shapes} className="w-full h-32" />
                    </div>

                    {/* info + actions */}
                    <div className="p-3">
                      <p className="font-black text-white text-sm truncate mb-0.5">{d.name}</p>
                      <p className="text-[10px] text-slate-500 mb-3">
                        {shapes.length} shape{shapes.length !== 1 ? 's' : ''} · {fmtDate(d.created_at)}
                        {d.creator_name && <> · <span className="text-slate-400">{d.creator_name}</span></>}
                      </p>

                      {isConfirming ? (
                        /* delete confirmation row */
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-black text-[10px] uppercase rounded-lg transition-all"
                          >Keep</button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            disabled={isDeleting}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-[10px] uppercase rounded-lg transition-all"
                          >{isDeleting ? '…' : 'Delete'}</button>
                        </div>
                      ) : (
                        /* normal actions */
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit(d)}
                            className="flex-[2] py-2 bg-pink-600 hover:bg-pink-500 text-white font-black text-[10px] uppercase rounded-lg transition-all active:translate-y-px"
                          >✏ Edit</button>
                          <button
                            onClick={() => setConfirmDelete(d.id)}
                            className="flex-1 py-2 bg-slate-700 hover:bg-red-900/60 text-slate-400 hover:text-red-300 font-black text-[10px] uppercase rounded-lg transition-all"
                          >🗑</button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── SAVE MODAL ────────────────────────────────────────────────────
// Handles both INSERT (new) and UPDATE (editing existing).
function SaveModal({ shapes, existingId, existingName, onClose, onSaved }) {
  const isEditing = Boolean(existingId);
  const [name,        setName]        = useState(existingName || '');
  const [creatorName, setCreatorName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [errMsg, setErrMsg] = useState('');

  async function handleSave() {
    if (!name.trim() || !creatorName.trim() || shapes.length === 0) return;
    setStatus('saving');
    setErrMsg('');

    let error, data;
    if (isEditing) {
      ({ error } = await supabase
        .from('drawings')
        .update({ name: name.trim(), creator_name: creatorName.trim(), shape_data: { shapes } })
        .eq('id', existingId));
    } else {
      ({ error, data } = await supabase
        .from('drawings')
        .insert({ name: name.trim(), creator_name: creatorName.trim(), shape_type: 'composite', shape_data: { shapes } })
        .select('id')
        .single());
    }

    if (error) { setErrMsg(error.message); setStatus('error'); }
    else       { setStatus('saved'); onSaved?.({ name: name.trim(), id: data?.id }); }
  }

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdrop}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{   scale: 0.92, opacity: 0, y: 10  }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl font-mono"
      >
        {status !== 'saved' ? (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 mb-3">
              <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">
                {isEditing ? '✏️ Update Drawing' : '💾 Save Drawing'}
              </span>
            </div>
            <h2 className="text-xl font-black text-white mb-1">
              {isEditing ? 'Update your drawing' : 'Name your drawing'}
            </h2>
            <p className="text-slate-500 text-xs mb-4 leading-relaxed">
              {isEditing
                ? 'Changes will overwrite the existing saved version.'
                : 'Saved to your character library for use in future games.'}
            </p>

            {/* mini preview */}
            <div className="bg-slate-800/60 border border-white/5 rounded-xl p-2 mb-5">
              <DrawingPreview shapes={shapes} className="w-full h-24" />
              <p className="text-[10px] text-slate-600 text-center mt-1">
                {shapes.length} shape{shapes.length !== 1 ? 's' : ''}
              </p>
            </div>

            <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">
              Drawing name
            </label>
            <input
              autoFocus
              type="text"
              maxLength={48}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. My House, Cool Fish…"
              className="w-full bg-slate-800 border-2 border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none transition-colors placeholder:text-slate-600 mb-4"
            />

            <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">
              Your name
            </label>
            <input
              type="text"
              maxLength={48}
              value={creatorName}
              onChange={e => setCreatorName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Alex"
              className="w-full bg-slate-800 border-2 border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none transition-colors placeholder:text-slate-600 mb-2"
            />

            {status === 'error' && (
              <p className="text-red-400 text-xs font-bold mb-3 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                ⚠ {errMsg || 'Something went wrong. Try again.'}
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={onClose}
                disabled={status === 'saving'}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-black text-sm rounded-xl transition-all uppercase"
              >Cancel</button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || !creatorName.trim() || status === 'saving'}
                className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition-all uppercase"
              >{status === 'saving' ? '⏳ Saving…' : (isEditing ? 'Update →' : 'Save →')}</button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">{isEditing ? '✅' : '🎉'}</div>
            <h2 className="text-2xl font-black text-yellow-400 italic mb-2">
              {isEditing ? 'Updated!' : 'Saved!'}
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              "<span className="text-white font-bold">{name}</span>"
              {isEditing ? ' has been updated.' : ' added to your library.'}
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-white text-black font-black rounded-xl text-sm active:scale-95 transition-all uppercase"
            >Done</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────
export default function CodeDrawingGame() {
  const [mode,               setMode]               = useState('menu');
  const [selectedChallenge,  setSelectedChallenge]  = useState(null);
  const [shapes,             setShapes]             = useState([]);
  const [activeShape,        setActiveShape]        = useState(null);
  const [showSaveModal,      setShowSaveModal]      = useState(false);
  const [showLibrary,        setShowLibrary]        = useState(false);
  // tracks the DB row when editing a saved drawing
  const [currentDrawingId,   setCurrentDrawingId]   = useState(null);
  const [currentDrawingName, setCurrentDrawingName] = useState('');

  const startFreeMode = () => {
    setMode('free');
    setShapes([]);
    setActiveShape(null);
    setSelectedChallenge(null);
    setCurrentDrawingId(null);
    setCurrentDrawingName('');
  };

  const startChallenge = (name) => {
    setMode('challenge');
    setSelectedChallenge(name);
    setShapes([]);
    setActiveShape(null);
    setCurrentDrawingId(null);
    setCurrentDrawingName('');
  };

  // Called from LibraryModal when user clicks Edit on a card
  const openDrawingForEdit = (drawing) => {
    setShapes(drawing.shape_data?.shapes || []);
    setActiveShape(null);
    setCurrentDrawingId(drawing.id);
    setCurrentDrawingName(drawing.name);
    setMode('free');
    setShowLibrary(false);
  };

  const addShape = (type) => {
    const id = crypto.randomUUID();
    const newShape = { id, type, color: FUNKY_COLORS[Math.floor(Math.random() * 5)], rotation: 0, params: {} };
    if (type === 'circle')  newShape.params = { cx: 10, cy: 10, r: 3 };
    if (type === 'rect')    newShape.params = { x: 5, y: 5, w: 4, h: 4 };
    if (type === 'ellipse') newShape.params = { x: 5, y: 8, w: 8, h: 4 };
    if (type === 'line')    newShape.params = { x1: 2, y1: 2, x2: 10, y2: 10 };
    if (type === 'polygon') newShape.params = { p1x: 5, p1y: 15, p2x: 10, p2y: 5, p3x: 15, p3y: 15 };
    setActiveShape(newShape);
  };

  const updateParam = (k, v) => {
    const updated = { ...activeShape, params: { ...activeShape.params, [k]: parseFloat(v) || 0 } };
    setActiveShape(updated);
    if (shapes.find(s => s.id === activeShape.id))
      setShapes(shapes.map(s => s.id === activeShape.id ? updated : s));
  };

  const updateRotation = (v) => {
    const updated = { ...activeShape, rotation: parseFloat(v) || 0 };
    setActiveShape(updated);
    if (shapes.find(s => s.id === activeShape.id))
      setShapes(shapes.map(s => s.id === activeShape.id ? updated : s));
  };

  const saveShape = () => {
    if (shapes.find(s => s.id === activeShape.id))
      setShapes(shapes.map(s => s.id === activeShape.id ? activeShape : s));
    else
      setShapes([activeShape, ...shapes]);
    setActiveShape(null);
  };

  // ── MENU ────────────────────────────────────────────────────────
  if (mode === 'menu') {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center font-mono">
        <div className="text-center">
          <h1 className="text-5xl font-black text-pink-500 italic uppercase mb-8">Shape Lab</h1>
          <div className="space-y-3">
            <button onClick={startFreeMode}               className="block w-80 bg-emerald-600 hover:bg-emerald-500 py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1">🎨 Free Draw Mode</button>
            <button onClick={() => startChallenge('house')}  className="block w-80 bg-pink-600   hover:bg-pink-500   py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1">🏠 Challenge: House</button>
            <button onClick={() => startChallenge('fish')}   className="block w-80 bg-blue-600   hover:bg-blue-500   py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1">🐟 Challenge: Fish</button>
            <button onClick={() => startChallenge('flower')} className="block w-80 bg-purple-600 hover:bg-purple-500 py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1">🌸 Challenge: Flower</button>

            {/* ── MY LIBRARY BUTTON ── */}
            <button
              onClick={() => setShowLibrary(true)}
              className="block w-80 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-500 py-5 rounded-xl font-black text-lg uppercase transition-all active:translate-y-1 text-slate-300"
            >
              📚 My Library
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showLibrary && (
            <LibraryModal
              onClose={() => setShowLibrary(false)}
              onEdit={openDrawingForEdit}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── GAME (free / challenge) ──────────────────────────────────────
  const targetShapes = mode === 'challenge' ? CHALLENGES[selectedChallenge] : [];

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col md:flex-row font-mono overflow-hidden">

      {/* LEFT: GRID */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 relative select-none">
        <div className="relative w-full aspect-square max-w-[550px] border-2 border-slate-800 bg-[#01040a]">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`x-${i}`} className="absolute text-[10px] text-slate-600" style={{ left: `${(i*5/GRID)*100}%`, top: '-20px' }}>{i*5}</span>
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`y-${i}`} className="absolute text-[10px] text-slate-600" style={{ left: '-20px', top: `${(i*5/GRID)*100}%` }}>{i*5}</span>
          ))}
          <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible cursor-crosshair">
            {Array.from({ length: GRID + 1 }).map((_, i) => (
              <line key={`v${i}`} x1={i} y1="0" x2={i} y2={GRID} stroke="#1a202c" strokeWidth="0.05" />
            ))}
            {Array.from({ length: GRID + 1 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i} x2={GRID} y2={i} stroke="#1a202c" strokeWidth="0.05" />
            ))}
            {mode === 'challenge' && targetShapes.map(s => (
              <g key={`t-${s.id}`}><ShapeRenderer s={s} isOutline={true} /></g>
            ))}
            {[...shapes].reverse().map(s => (
              <g key={s.id} onClick={() => setActiveShape(s)} className="cursor-pointer">
                <ShapeRenderer s={s} isSelected={activeShape?.id === s.id} />
                <ShapeRenderer s={s} isHitbox={true} />
                <PointLabels   s={s} isSelected={activeShape?.id === s.id} />
              </g>
            ))}
            {activeShape && !shapes.find(s => s.id === activeShape.id) && (
              <>
                <ShapeRenderer s={activeShape} isSelected={true} />
                <PointLabels   s={activeShape} isSelected={true} />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* RIGHT: CONTROL PANEL */}
      <div className="w-full md:w-[420px] bg-slate-900 border-l border-white/10 p-5 flex flex-col overflow-hidden shadow-2xl">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-xl font-black text-pink-500 italic uppercase leading-tight">
                {mode === 'challenge' ? `Challenge: ${selectedChallenge}` : 'Shape Lab'}
              </h1>
              {/* show which saved drawing is loaded */}
              {currentDrawingId && (
                <p className="text-[10px] text-emerald-400 font-bold mt-0.5 truncate max-w-[220px]">
                  ✏ Editing: {currentDrawingName}
                </p>
              )}
            </div>
            <button onClick={() => setMode('menu')} className="text-xs text-slate-500 hover:text-white uppercase font-bold shrink-0">← Menu</button>
          </div>

          <div className="flex gap-1 mt-3">
            {['circle', 'rect', 'ellipse', 'line', 'polygon'].map(type => (
              <button key={type} onClick={() => addShape(type)} className="flex-1 bg-slate-800 hover:bg-pink-600 py-2 rounded text-[8px] font-black uppercase transition-all">
                {type}
              </button>
            ))}
          </div>

          {/* SAVE DRAWING — only in Free Mode */}
          {mode === 'free' && (
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={shapes.length === 0}
              className={`w-full mt-3 py-3 rounded-lg font-black text-xs uppercase transition-all ${
                shapes.length === 0
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : currentDrawingId
                    ? 'bg-emerald-700 hover:bg-emerald-600 text-white active:translate-y-1 border border-emerald-500/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:translate-y-1'
              }`}
            >
              {currentDrawingId ? '💾 Update Drawing' : '💾 Save Drawing'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            {activeShape ? (
              <motion.div key="editor" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div className="bg-black/40 p-4 rounded-xl border border-pink-500/30 mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-black text-emerald-400 uppercase italic">Editing: {activeShape.type}</h2>
                    <button onClick={() => { setShapes(shapes.filter(s => s.id !== activeShape.id)); setActiveShape(null); }} className="text-[10px] text-red-400 hover:underline">DELETE</button>
                  </div>

                  <div className="grid grid-cols-10 gap-1 mb-6">
                    {FUNKY_COLORS.map(c => (
                      <button key={c} onClick={() => {
                        const u = {...activeShape, color: c};
                        setActiveShape(u);
                        if (shapes.find(s => s.id === activeShape.id)) setShapes(shapes.map(s => s.id === activeShape.id ? u : s));
                      }} className={`w-full aspect-square rounded-sm ${activeShape.color === c ? 'ring-2 ring-white scale-110' : 'opacity-40'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {Object.entries(activeShape.params).map(([k, v]) => (
                      <div key={k} className="bg-slate-800 p-2 rounded">
                        <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">{k}</label>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateParam(k, v - 1)} className="bg-slate-700 hover:bg-pink-600 text-white font-black w-7 h-7 rounded flex items-center justify-center transition-all shrink-0">−</button>
                          <input type="number" value={v} onChange={e => updateParam(k, e.target.value)} className="w-12 bg-slate-900 font-black text-sm outline-none text-pink-400 text-center rounded px-1" />
                          <button onClick={() => updateParam(k, v + 1)} className="bg-slate-700 hover:bg-pink-600 text-white font-black w-7 h-7 rounded flex items-center justify-center transition-all shrink-0">+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-800 p-2 rounded mb-4">
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Rotation (degrees)</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateRotation((activeShape.rotation || 0) - 15)} className="bg-slate-700 hover:bg-emerald-600 text-white font-black w-8 h-8 rounded flex items-center justify-center transition-all shrink-0">−</button>
                      <input type="number" value={activeShape.rotation || 0} onChange={e => updateRotation(e.target.value)} className="flex-1 bg-slate-900 font-black text-sm outline-none text-emerald-400 text-center rounded px-2" />
                      <button onClick={() => updateRotation((activeShape.rotation || 0) + 15)} className="bg-slate-700 hover:bg-emerald-600 text-white font-black w-8 h-8 rounded flex items-center justify-center transition-all shrink-0">+</button>
                    </div>
                  </div>

                  <button onClick={saveShape} className="w-full bg-pink-600 text-white font-black py-4 rounded-xl shadow-lg active:translate-y-1">DONE EDITING</button>
                  <button onClick={() => setActiveShape(null)} className="w-full mt-2 text-slate-500 font-bold text-xs py-2">CANCEL</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="layers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">Canvas Layers</p>
                <Reorder.Group axis="y" values={shapes} onReorder={setShapes} className="space-y-2">
                  {shapes.map(s => (
                    <Reorder.Item key={s.id} value={s} className="bg-slate-800/40 p-3 rounded-lg flex items-center border border-transparent hover:border-pink-500/50">
                      <div className="w-6 h-6 rounded mr-3 shrink-0" style={{ backgroundColor: s.color }} />
                      <div className="flex-1 cursor-pointer min-w-0" onClick={() => setActiveShape(s)}>
                        <p className="text-[10px] font-black uppercase">{s.type}</p>
                        <p className="text-[8px] text-slate-500 italic">Click to edit</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setShapes(shapes.filter(sh => sh.id !== s.id)); if (activeShape?.id === s.id) setActiveShape(null); }}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 hover:bg-red-400/10 rounded shrink-0"
                      >✕</button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                {shapes.length === 0 && (
                  <div className="text-center mt-20 text-slate-700 italic text-sm">
                    {mode === 'challenge' ? 'Recreate the outline shapes above!' : 'Grid is empty. Add a shape!'}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── SAVE / UPDATE MODAL ── */}
      <AnimatePresence>
        {showSaveModal && (
          <SaveModal
            shapes={shapes}
            existingId={currentDrawingId}
            existingName={currentDrawingName}
            onClose={() => setShowSaveModal(false)}
            onSaved={({ name, id }) => {
              setCurrentDrawingName(name);
              if (id) setCurrentDrawingId(id); // track new row id for future updates
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}