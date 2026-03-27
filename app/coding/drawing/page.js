'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  '#4ADE80', '#F43F5E', '#FACC15', '#FFFFFF', '#000000',
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

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── SHAPE RENDERER ────────────────────────────────────────────────
function ShapeRenderer({ s, isSelected, isHitbox, isOutline }) {
  const props = {
    fill:            isOutline ? 'none'     : (isHitbox ? 'transparent' : s.color),
    stroke:          isOutline ? '#4ADE80'  : (isHitbox ? 'transparent' : (isSelected ? 'white' : 'none')),
    strokeWidth:     isOutline ? 0.3        : (isHitbox ? 1 : 0.2),
    strokeDasharray: isOutline ? '0.5,0.5' : undefined,
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

function DrawingPreview({ shapes, className = '', showGrid = false }) {
  return (
    <svg viewBox="0 0 20 20" className={`bg-[#01040a] rounded-lg ${className}`}>
      {showGrid && Array.from({ length: 21 }).map((_, i) => (
        <g key={i}>
          <line x1={i} y1="0" x2={i} y2={20} stroke="#1a202c" strokeWidth="0.08" />
          <line x1="0" y1={i} x2={20} y2={i} stroke="#1a202c" strokeWidth="0.08" />
        </g>
      ))}
      {[...shapes].reverse().map(s => (
        <ShapeRenderer key={s.id} s={s} />
      ))}
    </svg>
  );
}

// ── SAVE MODAL ────────────────────────────────────────────────────
function SaveModal({ type, data, existingId, existingName, onClose, onSaved }) {
  const isEditing = Boolean(existingId);
  const isAnimation = type === 'animation';
  const [name, setName] = useState(existingName || '');
  const [creatorName, setCreatorName] = useState('');
  const [status, setStatus] = useState('idle');
  const [errMsg, setErrMsg] = useState('');

  async function handleSave() {
    if (!name.trim() || !creatorName.trim()) return;
    if (isAnimation && (!data.frames || data.frames.length === 0)) return;
    if (!isAnimation && (!data.shapes || data.shapes.length === 0)) return;

    setStatus('saving');
    setErrMsg('');

    let error, result;

    if (isAnimation) {
      const payload = {
        name: name.trim(),
        creator_name: creatorName.trim(),
        fps: data.fps || 4,
        frame_count: data.frames.length,
        animation_data: { frames: data.frames }
      };

      if (isEditing) {
        ({ error } = await supabase.from('animations').update(payload).eq('id', existingId));
      } else {
        ({ error, data: result } = await supabase.from('animations').insert(payload).select('id').single());
      }
    } else {
      const payload = {
        name: name.trim(),
        creator_name: creatorName.trim(),
        shape_type: 'composite',
        shape_data: { shapes: data.shapes }
      };

      if (isEditing) {
        ({ error } = await supabase.from('drawings').update(payload).eq('id', existingId));
      } else {
        ({ error, data: result } = await supabase.from('drawings').insert(payload).select('id').single());
      }
    }

    if (error) {
      setErrMsg(error.message);
      setStatus('error');
    } else {
      setStatus('saved');
      onSaved?.({ name: name.trim(), id: result?.id || existingId });
    }
  }

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  const itemCount = isAnimation ? (data.frames?.length || 0) : (data.shapes?.length || 0);
  const itemLabel = isAnimation ? 'frame' : 'shape';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleBackdrop}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl font-mono"
      >
        {status !== 'saved' ? (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 mb-3">
              <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">
                {isEditing ? '✏️ Update' : '💾 Save'} {isAnimation ? 'Animation' : 'Drawing'}
              </span>
            </div>
            <h2 className="text-xl font-black text-white mb-1">
              {isEditing ? 'Update your ' + (isAnimation ? 'animation' : 'drawing') : 'Name your ' + (isAnimation ? 'animation' : 'drawing')}
            </h2>
            <p className="text-slate-500 text-xs mb-4 leading-relaxed">
              {isEditing ? 'Changes will overwrite the existing saved version.' : `Saved to your library for use in future sessions.`}
            </p>

            <div className="bg-slate-800/60 border border-white/5 rounded-xl p-2 mb-5">
              {isAnimation ? (
                <DrawingPreview shapes={data.frames?.[0] || []} className="w-full h-24" />
              ) : (
                <DrawingPreview shapes={data.shapes || []} className="w-full h-24" />
              )}
              <p className="text-[10px] text-slate-600 text-center mt-1">
                {itemCount} {itemLabel}{itemCount !== 1 ? 's' : ''}
                {isAnimation && ` · ${data.fps || 4} FPS`}
              </p>
            </div>

            <label className="block text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1.5">
              {isAnimation ? 'Animation' : 'Drawing'} name
            </label>
            <input
              autoFocus
              type="text"
              maxLength={48}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={`e.g. My ${isAnimation ? 'Bouncing Ball' : 'House'}...`}
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
                disabled={!name.trim() || !creatorName.trim() || itemCount === 0 || status === 'saving'}
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

// ── LIBRARY MODAL ─────────────────────────────────────────────────
function LibraryModal({ onClose, onEditDrawing, onLoadAnimation }) {
  const [activeTab, setActiveTab] = useState('drawings');
  const [drawings, setDrawings] = useState([]);
  const [animations, setAnimations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    const { data: drawingsData } = await supabase
      .from('drawings')
      .select('id, name, creator_name, shape_data, created_at')
      .eq('shape_type', 'composite')
      .order('created_at', { ascending: false });
    
    const { data: animationsData } = await supabase
      .from('animations')
      .select('id, name, creator_name, fps, frame_count, animation_data, created_at')
      .order('created_at', { ascending: false });

    if (drawingsData) setDrawings(drawingsData);
    if (animationsData) setAnimations(animationsData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(type, id) {
    setDeleting(id);
    const table = type === 'animation' ? 'animations' : 'drawings';
    await supabase.from(table).delete().eq('id', id);
    
    if (type === 'animation') {
      setAnimations(prev => prev.filter(d => d.id !== id));
    } else {
      setDrawings(prev => prev.filter(d => d.id !== id));
    }
    setDeleting(null);
    setConfirmDelete(null);
  }

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  const currentItems = activeTab === 'drawings' ? drawings : animations;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleBackdrop}>
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl font-mono overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full border border-pink-500/30 bg-pink-500/10 mb-1">
              <span className="text-pink-400 font-black text-[10px] uppercase tracking-widest">📚 My Library</span>
            </div>
            <h2 className="text-lg font-black text-white leading-tight">Saved Creations</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-xl font-black w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-all"
          >✕</button>
        </div>

        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('drawings')}
            className={`flex-1 py-3 text-sm font-black uppercase transition-all ${
              activeTab === 'drawings' 
                ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-400/5' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            🎨 Drawings ({drawings.length})
          </button>
          <button
            onClick={() => setActiveTab('animations')}
            className={`flex-1 py-3 text-sm font-black uppercase transition-all ${
              activeTab === 'animations' 
                ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-400/5' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            🎬 Animations ({animations.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm italic">Loading your library...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="text-5xl">{activeTab === 'drawings' ? '🎨' : '🎬'}</div>
              <p className="text-slate-400 font-black text-base uppercase">
                No {activeTab} yet
              </p>
              <p className="text-slate-600 text-xs italic">
                {activeTab === 'drawings' 
                  ? 'Go to Free Draw Mode and save your first drawing!' 
                  : 'Create an animation and save it to see it here!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentItems.map(item => {
                const isAnimation = activeTab === 'animations';
                const shapes = isAnimation 
                  ? (item.animation_data?.frames?.[0] || []) 
                  : (item.shape_data?.shapes || []);
                const isConfirming = confirmDelete === item.id;
                const isDeleting = deleting === item.id;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-slate-800/50 border border-slate-700 hover:border-slate-500 rounded-xl overflow-hidden transition-colors group"
                  >
                    <div className="p-3 pb-0">
                      <DrawingPreview shapes={shapes} className="w-full h-32" />
                    </div>

                    <div className="p-3">
                      <p className="font-black text-white text-sm truncate mb-0.5">{item.name}</p>
                      <p className="text-[10px] text-slate-500 mb-3">
                        {isAnimation 
                          ? `${item.frame_count} frames · ${item.fps} FPS` 
                          : `${shapes.length} shape${shapes.length !== 1 ? 's' : ''}`} 
                        · {fmtDate(item.created_at)}
                        {item.creator_name && <> · <span className="text-slate-400">{item.creator_name}</span></>}
                      </p>

                      {isConfirming ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-black text-[10px] uppercase rounded-lg transition-all"
                          >Keep</button>
                          <button
                            onClick={() => handleDelete(isAnimation ? 'animation' : 'drawing', item.id)}
                            disabled={isDeleting}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-[10px] uppercase rounded-lg transition-all"
                          >{isDeleting ? '…' : 'Delete'}</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (isAnimation) {
                                onLoadAnimation?.(item);
                              } else {
                                onEditDrawing?.(item);
                              }
                            }}
                            className="flex-[2] py-2 bg-pink-600 hover:bg-pink-500 text-white font-black text-[10px] uppercase rounded-lg transition-all active:translate-y-px"
                          >{isAnimation ? '▶ Load' : '✏ Edit'}</button>
                          <button
                            onClick={() => setConfirmDelete(item.id)}
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

// ── SHAPE EDITOR PANEL ────────────────────────────────────────────
function ShapeEditorPanel({ shapes, setShapes, activeShape, setActiveShape, showAddButtons = true, targetShapes = [] }) {
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

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
      {showAddButtons && (
        <div className="flex gap-1 mb-3">
          {['circle', 'rect', 'ellipse', 'line', 'polygon'].map(type => (
            <button key={type} onClick={() => addShape(type)}
              className="flex-1 bg-slate-800 hover:bg-pink-600 py-2 rounded text-[8px] font-black uppercase transition-all">
              {type}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeShape ? (
          <motion.div key="editor" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-black/40 p-4 rounded-xl border border-pink-500/30 mb-3">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-black text-emerald-400 uppercase italic">✏ {activeShape.type}</h2>
                <button onClick={() => { setShapes(shapes.filter(s => s.id !== activeShape.id)); setActiveShape(null); }}
                  className="text-[10px] text-red-400 hover:underline">DELETE</button>
              </div>

              <div className="grid grid-cols-10 gap-1 mb-4">
                {FUNKY_COLORS.map(c => (
                  <button key={c} onClick={() => {
                    const u = { ...activeShape, color: c };
                    setActiveShape(u);
                    if (shapes.find(s => s.id === activeShape.id)) setShapes(shapes.map(s => s.id === activeShape.id ? u : s));
                  }} className={`w-full aspect-square rounded-sm transition-all ${activeShape.color === c ? 'ring-2 ring-white scale-110' : 'opacity-40'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {Object.entries(activeShape.params).map(([k, v]) => (
                  <div key={k} className="bg-slate-800 p-2 rounded">
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">{k}</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateParam(k, v - 1)} className="bg-slate-700 hover:bg-pink-600 text-white font-black w-6 h-6 rounded flex items-center justify-center text-xs transition-all shrink-0">−</button>
                      <input type="number" value={v} onChange={e => updateParam(k, e.target.value)}
                        className="w-10 bg-slate-900 font-black text-xs outline-none text-pink-400 text-center rounded px-1" />
                      <button onClick={() => updateParam(k, v + 1)} className="bg-slate-700 hover:bg-pink-600 text-white font-black w-6 h-6 rounded flex items-center justify-center text-xs transition-all shrink-0">+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-800 p-2 rounded mb-3">
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Rotation°</label>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateRotation((activeShape.rotation || 0) - 15)} className="bg-slate-700 hover:bg-emerald-600 text-white font-black w-7 h-7 rounded flex items-center justify-center transition-all">−</button>
                  <input type="number" value={activeShape.rotation || 0} onChange={e => updateRotation(e.target.value)}
                    className="flex-1 bg-slate-900 font-black text-sm outline-none text-emerald-400 text-center rounded px-2" />
                  <button onClick={() => updateRotation((activeShape.rotation || 0) + 15)} className="bg-slate-700 hover:bg-emerald-600 text-white font-black w-7 h-7 rounded flex items-center justify-center transition-all">+</button>
                </div>
              </div>

              <button onClick={saveShape} className="w-full bg-pink-600 text-white font-black py-3 rounded-xl active:translate-y-1 transition-all">DONE ✓</button>
              <button onClick={() => setActiveShape(null)} className="w-full mt-1 text-slate-500 font-bold text-xs py-2">CANCEL</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="layers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Layers</p>
            <Reorder.Group axis="y" values={shapes} onReorder={setShapes} className="space-y-1.5">
              {shapes.map(s => (
                <Reorder.Item key={s.id} value={s}
                  className="bg-slate-800/40 p-2.5 rounded-lg flex items-center border border-transparent hover:border-pink-500/50 cursor-grab">
                  <div className="w-5 h-5 rounded mr-2 shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="flex-1 cursor-pointer min-w-0" onClick={() => setActiveShape(s)}>
                    <p className="text-[10px] font-black uppercase">{s.type}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setShapes(shapes.filter(sh => sh.id !== s.id)); if (activeShape?.id === s.id) setActiveShape(null); }}
                    className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1 hover:bg-red-400/10 rounded shrink-0">✕</button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
            {shapes.length === 0 && (
              <div className="text-center mt-16 text-slate-700 italic text-sm">
                {targetShapes.length > 0 ? 'Recreate the outline above!' : 'Add a shape to begin!'}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ANIMATION MODE
// ══════════════════════════════════════════════════════════════════
function AnimationMode({ 
  initialShapes, 
  initialAllFrames,
  onBack, 
  initialAnimationId, 
  initialAnimationName, 
  initialFps 
}) {
  const [frames, setFrames] = useState(
    initialAllFrames && initialAllFrames.length > 0 
      ? deepClone(initialAllFrames) 
      : [deepClone(initialShapes)]
  );
  const [currentFrame, setCurrentFrame] = useState(0);
  const [activeShape, setActiveShape] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playFrame, setPlayFrame] = useState(0);
  const [fps, setFps] = useState(initialFps || 4);
  const [showOnionSkin, setShowOnionSkin] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentAnimationId, setCurrentAnimationId] = useState(initialAnimationId || null);
  const [currentAnimationName, setCurrentAnimationName] = useState(initialAnimationName || '');
  const intervalRef = useRef(null);

  const currentShapes = frames[currentFrame] || [];
  const setCurrentShapes = (newShapes) => {
    setFrames(prev => {
      const next = [...prev];
      next[currentFrame] = typeof newShapes === 'function' ? newShapes(next[currentFrame]) : newShapes;
      return next;
    });
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setPlayFrame(f => (f + 1) % frames.length);
      }, 1000 / fps);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, fps, frames.length]);

  const addFrame = () => {
    const newFrames = [...frames];
    newFrames.splice(currentFrame + 1, 0, deepClone(frames[currentFrame]));
    setFrames(newFrames);
    setCurrentFrame(currentFrame + 1);
    setActiveShape(null);
  };

  const deleteFrame = (idx) => {
    if (frames.length === 1) return;
    const newFrames = frames.filter((_, i) => i !== idx);
    setFrames(newFrames);
    setCurrentFrame(Math.min(currentFrame, newFrames.length - 1));
    setActiveShape(null);
  };

  const displayShapes = isPlaying ? (frames[playFrame] || []) : currentShapes;
  const prevShapes = showOnionSkin && !isPlaying && currentFrame > 0 ? frames[currentFrame - 1] : [];

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col font-mono overflow-hidden">

      {/* TOP BAR */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-b border-white/10 shrink-0">
        <button onClick={onBack} className="text-xs text-slate-500 hover:text-white uppercase font-bold shrink-0">← Draw</button>
        <div className="flex-1">
          <span className="text-sm font-black text-orange-400 uppercase tracking-wide">🎬 Animation Mode</span>
          {currentAnimationId && (
            <span className="text-[10px] text-emerald-400 font-bold ml-2">
              ✏ Editing: {currentAnimationName}
            </span>
          )}
          <span className="text-[10px] text-slate-600 ml-3">{frames.length} frame{frames.length !== 1 ? 's' : ''}</span>
        </div>

        <button
          onClick={() => setShowOnionSkin(v => !v)}
          className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all ${showOnionSkin ? 'bg-purple-600/30 border-purple-500/50 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
        >
          👻 Onion
        </button>

        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
          <span className="text-[9px] text-slate-500 font-black uppercase">FPS</span>
          <input type="range" min="1" max="12" value={fps} onChange={e => setFps(+e.target.value)}
            className="w-16 accent-orange-400" />
          <span className="text-orange-400 font-black text-xs w-4">{fps}</span>
        </div>

        <button
          onClick={() => setShowSaveModal(true)}
          disabled={frames.length === 0}
          className={`px-4 py-2 rounded-lg font-black text-xs uppercase transition-all ${
            frames.length === 0
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : currentAnimationId
                ? 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {currentAnimationId ? '💾 Update' : '💾 Save'}
        </button>

        <button
          onClick={() => { setIsPlaying(v => !v); setPlayFrame(0); }}
          className={`px-5 py-2 rounded-xl font-black text-sm uppercase transition-all active:translate-y-px ${isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-orange-500 hover:bg-orange-400 text-white'}`}
        >
          {isPlaying ? '⏹ Stop' : '▶ Play'}
        </button>
      </div>

      {/* MAIN AREA */}
      <div className="flex flex-1 overflow-hidden">

        {/* CANVAS */}
        <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 relative">
          {isPlaying && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-orange-500/20 border border-orange-500/40 rounded-full px-4 py-1">
              <span className="text-orange-400 font-black text-xs uppercase">Frame {playFrame + 1} / {frames.length}</span>
            </div>
          )}
          <div className="relative w-full aspect-square max-w-[520px] border-2 border-slate-800 bg-[#01040a]">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={`x-${i}`} className="absolute text-[10px] text-slate-600" style={{ left: `${(i * 5 / GRID) * 100}%`, top: '-18px' }}>{i * 5}</span>
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={`y-${i}`} className="absolute text-[10px] text-slate-600" style={{ left: '-18px', top: `${(i * 5 / GRID) * 100}%` }}>{i * 5}</span>
            ))}
            <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible cursor-crosshair">
              {Array.from({ length: GRID + 1 }).map((_, i) => (
                <g key={i}>
                  <line x1={i} y1="0" x2={i} y2={GRID} stroke="#1a202c" strokeWidth="0.05" />
                  <line x1="0" y1={i} x2={GRID} y2={i} stroke="#1a202c" strokeWidth="0.05" />
                </g>
              ))}

              {prevShapes.map(s => (
                <g key={`onion-${s.id}`} opacity="0.2">
                  <ShapeRenderer s={{ ...s, color: '#a78bfa' }} />
                </g>
              ))}

              {[...displayShapes].reverse().map(s => (
                <g key={s.id} onClick={() => !isPlaying && setActiveShape(s)} className={isPlaying ? '' : 'cursor-pointer'}>
                  <ShapeRenderer s={s} isSelected={activeShape?.id === s.id} />
                  <ShapeRenderer s={s} isHitbox={true} />
                  <PointLabels s={s} isSelected={activeShape?.id === s.id} />
                </g>
              ))}
              {activeShape && !currentShapes.find(s => s.id === activeShape.id) && !isPlaying && (
                <>
                  <ShapeRenderer s={activeShape} isSelected={true} />
                  <PointLabels s={activeShape} isSelected={true} />
                </>
              )}
            </svg>
          </div>
        </div>

        {/* RIGHT PANEL */}
        {!isPlaying && (
          <div className="w-[340px] bg-slate-900 border-l border-white/10 p-4 flex flex-col overflow-hidden">
            <div className="mb-3 shrink-0">
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">
                Editing Frame {currentFrame + 1}
              </p>
              <p className="text-[9px] text-slate-600">Move shapes slightly between frames to animate!</p>
            </div>
            <ShapeEditorPanel
              shapes={currentShapes}
              setShapes={setCurrentShapes}
              activeShape={activeShape}
              setActiveShape={setActiveShape}
              showAddButtons={true}
            />
          </div>
        )}
      </div>

      {/* FILMSTRIP */}
      <div className="bg-slate-900 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
          <span className="text-[9px] text-slate-600 uppercase font-black shrink-0 mr-1">Frames</span>

          {frames.map((frameShapes, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 shrink-0">
              <button
                onClick={() => { if (!isPlaying) { setCurrentFrame(idx); setActiveShape(null); } }}
                className={`relative w-16 h-16 rounded-lg border-2 transition-all overflow-hidden ${
                  !isPlaying && currentFrame === idx
                    ? 'border-orange-400 shadow-lg shadow-orange-500/30'
                    : isPlaying && playFrame === idx
                    ? 'border-green-400 shadow-lg shadow-green-500/30'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <DrawingPreview shapes={frameShapes} className="w-full h-full rounded-none" />
                {isPlaying && playFrame === idx && (
                  <div className="absolute inset-0 bg-green-400/10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                  </div>
                )}
              </button>
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-slate-600 font-bold">{idx + 1}</span>
                {frames.length > 1 && !isPlaying && (
                  <button onClick={() => deleteFrame(idx)}
                    className="text-[9px] text-red-500/50 hover:text-red-400 ml-1 leading-none">✕</button>
                )}
              </div>
            </div>
          ))}

          {!isPlaying && (
            <button onClick={addFrame}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-700 hover:border-orange-400 hover:bg-orange-400/5 flex items-center justify-center transition-all shrink-0 group">
              <span className="text-2xl text-slate-600 group-hover:text-orange-400 transition-colors leading-none">+</span>
            </button>
          )}
        </div>
      </div>

      {/* SAVE MODAL */}
      <AnimatePresence>
        {showSaveModal && (
          <SaveModal
            type="animation"
            data={{ frames, fps }}
            existingId={currentAnimationId}
            existingName={currentAnimationName}
            onClose={() => setShowSaveModal(false)}
            onSaved={({ name, id }) => {
              setCurrentAnimationName(name);
              if (id) setCurrentAnimationId(id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DRAW MODE
// ══════════════════════════════════════════════════════════════════
function DrawMode({ onAnimate, onBack, initialMode, initialChallenge, initialDrawingId, initialDrawingName, initialShapes }) {
  const [mode, setMode] = useState(initialMode || 'free');
  const [selectedChallenge, setSelectedChallenge] = useState(initialChallenge || null);
  const [shapes, setShapes] = useState(initialShapes || []);
  const [activeShape, setActiveShape] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentDrawingId, setCurrentDrawingId] = useState(initialDrawingId || null);
  const [currentDrawingName, setCurrentDrawingName] = useState(initialDrawingName || '');

  const targetShapes = mode === 'challenge' ? (CHALLENGES[selectedChallenge] || []) : [];

  const handleAnimate = () => {
    onAnimate(shapes, currentDrawingId, currentDrawingName);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col md:flex-row font-mono overflow-hidden">

      {/* LEFT: GRID */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 relative select-none">
        <div className="relative w-full aspect-square max-w-[550px] border-2 border-slate-800 bg-[#01040a]">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`x-${i}`} className="absolute text-[10px] text-slate-600" style={{ left: `${(i * 5 / GRID) * 100}%`, top: '-20px' }}>{i * 5}</span>
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`y-${i}`} className="absolute text-[10px] text-slate-600" style={{ left: '-20px', top: `${(i * 5 / GRID) * 100}%` }}>{i * 5}</span>
          ))}
          <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible cursor-crosshair">
            {Array.from({ length: GRID + 1 }).map((_, i) => (
              <g key={i}>
                <line x1={i} y1="0" x2={i} y2={GRID} stroke="#1a202c" strokeWidth="0.05" />
                <line x1="0" y1={i} x2={GRID} y2={i} stroke="#1a202c" strokeWidth="0.05" />
              </g>
            ))}
            {targetShapes.map(s => (
              <g key={`t-${s.id}`}><ShapeRenderer s={s} isOutline={true} /></g>
            ))}
            {[...shapes].reverse().map(s => (
              <g key={s.id} onClick={() => setActiveShape(s)} className="cursor-pointer">
                <ShapeRenderer s={s} isSelected={activeShape?.id === s.id} />
                <ShapeRenderer s={s} isHitbox={true} />
                <PointLabels s={s} isSelected={activeShape?.id === s.id} />
              </g>
            ))}
            {activeShape && !shapes.find(s => s.id === activeShape.id) && (
              <>
                <ShapeRenderer s={activeShape} isSelected={true} />
                <PointLabels s={activeShape} isSelected={true} />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* RIGHT: CONTROL PANEL */}
      <div className="w-full md:w-[420px] bg-slate-900 border-l border-white/10 p-5 flex flex-col overflow-hidden shadow-2xl">
        <div className="shrink-0 mb-3">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-xl font-black text-pink-500 italic uppercase leading-tight">
                {mode === 'challenge' ? `Challenge: ${selectedChallenge}` : 'Shape Lab'}
              </h1>
              {currentDrawingId && (
                <p className="text-[10px] text-emerald-400 font-bold mt-0.5 truncate max-w-[220px]">
                  ✏ Editing: {currentDrawingName}
                </p>
              )}
            </div>
            <button onClick={onBack} className="text-xs text-slate-500 hover:text-white uppercase font-bold">← Menu</button>
          </div>

          {shapes.length > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleAnimate}
              className="w-full mb-3 py-3 bg-orange-500 hover:bg-orange-400 text-white font-black text-sm uppercase rounded-xl transition-all active:translate-y-px shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
            >
              🎬 Animate This!
            </motion.button>
          )}
        </div>

        <ShapeEditorPanel
          shapes={shapes}
          setShapes={setShapes}
          activeShape={activeShape}
          setActiveShape={setActiveShape}
          showAddButtons={true}
          targetShapes={targetShapes}
        />

        {mode === 'free' && (
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={shapes.length === 0}
            className={`mt-4 py-3 rounded-xl font-black text-sm uppercase transition-all ${
              shapes.length === 0
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : currentDrawingId
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {currentDrawingId ? '💾 Update Drawing' : '💾 Save Drawing'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSaveModal && (
          <SaveModal
            type="drawing"
            data={{ shapes }}
            existingId={currentDrawingId}
            existingName={currentDrawingName}
            onClose={() => setShowSaveModal(false)}
            onSaved={({ name, id }) => {
              setCurrentDrawingName(name);
              if (id) setCurrentDrawingId(id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN MENU
// ══════════════════════════════════════════════════════════════════
export default function CodeDrawingGame() {
  const [screen, setScreen] = useState('menu');
  const [drawConfig, setDrawConfig] = useState({ mode: 'free', challenge: null, drawingId: null, drawingName: '', shapes: [] });
  const [animateConfig, setAnimateConfig] = useState({ 
    shapes: [], 
    allFrames: null,
    animationId: null, 
    animationName: '', 
    fps: 4 
  });
  const [showLibrary, setShowLibrary] = useState(false);

  const goAnimate = (shapes, drawingId = null, drawingName = '') => {
    setAnimateConfig({ 
      shapes: deepClone(shapes), 
      allFrames: null,
      animationId: null, 
      animationName: '', 
      fps: 4 
    });
    setScreen('animate');
  };

  const goBackToDraw = () => {
    setScreen('draw');
  };

  const goToMenu = () => {
    setScreen('menu');
    setDrawConfig({ mode: 'free', challenge: null, drawingId: null, drawingName: '', shapes: [] });
  };

  const startFreeMode = () => {
    setDrawConfig({ mode: 'free', challenge: null, drawingId: null, drawingName: '', shapes: [] });
    setScreen('draw');
  };

  const startChallenge = (name) => {
    setDrawConfig({ mode: 'challenge', challenge: name, drawingId: null, drawingName: '', shapes: [] });
    setScreen('draw');
  };

  const openDrawingForEdit = (drawing) => {
    setDrawConfig({
      mode: 'free',
      challenge: null,
      drawingId: drawing.id,
      drawingName: drawing.name,
      shapes: drawing.shape_data?.shapes || []
    });
    setShowLibrary(false);
    setScreen('draw');
  };

  const openAnimationForEdit = (animation) => {
    const frames = animation.animation_data?.frames || [[]];
    setAnimateConfig({
      shapes: frames[0] || [],
      allFrames: frames,
      animationId: animation.id,
      animationName: animation.name,
      fps: animation.fps || 4
    });
    setShowLibrary(false);
    setScreen('animate');
  };

  if (screen === 'draw') {
    return (
      <DrawMode
        initialMode={drawConfig.mode}
        initialChallenge={drawConfig.challenge}
        initialDrawingId={drawConfig.drawingId}
        initialDrawingName={drawConfig.drawingName}
        initialShapes={drawConfig.shapes}
        onAnimate={goAnimate}
        onBack={goToMenu}
      />
    );
  }

  if (screen === 'animate') {
    return (
      <AnimationMode
        initialShapes={animateConfig.shapes}
        initialAllFrames={animateConfig.allFrames}
        initialAnimationId={animateConfig.animationId}
        initialAnimationName={animateConfig.animationName}
        initialFps={animateConfig.fps}
        onBack={goBackToDraw}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center font-mono">
      <div className="text-center">
        <h1 className="text-5xl font-black text-pink-500 italic uppercase mb-2">Shape Lab</h1>
        <p className="text-slate-600 text-xs uppercase tracking-widest mb-8">Draw · Animate · Create</p>
        <div className="space-y-3">
          <button onClick={startFreeMode}
            className="block w-80 bg-emerald-600 hover:bg-emerald-500 py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1">
            🎨 Free Draw Mode
          </button>
          <button onClick={() => startChallenge('house')}
            className="block w-80 bg-pink-600 hover:bg-pink-500 py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1">
            🏠 Challenge: House
          </button>
          <button onClick={() => startChallenge('fish')}
            className="block w-80 bg-blue-600 hover:bg-blue-500 py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1">
            🐟 Challenge: Fish
          </button>
          <button onClick={() => startChallenge('flower')}
            className="block w-80 bg-purple-600 hover:bg-purple-500 py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1">
            🌸 Challenge: Flower
          </button>

          <button
            onClick={() => setShowLibrary(true)}
            className="block w-80 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-500 py-5 rounded-xl font-black text-lg uppercase transition-all active:translate-y-1 text-slate-300"
          >
            📚 My Library
          </button>
        </div>

        <div className="mt-8 bg-orange-500/10 border border-orange-500/20 rounded-xl px-6 py-3 w-80">
          <p className="text-orange-400 font-black text-xs uppercase tracking-wide mb-1">🎬 New: Animation!</p>
          <p className="text-slate-500 text-[10px]">Draw something, then hit <span className="text-orange-400 font-bold">"Animate This!"</span> to bring it to life frame by frame.</p>
        </div>
      </div>

      <AnimatePresence>
        {showLibrary && (
          <LibraryModal
            onClose={() => setShowLibrary(false)}
            onEditDrawing={openDrawingForEdit}
            onLoadAnimation={openAnimationForEdit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}