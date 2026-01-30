'use client';
import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

const GRID = 20;
const FUNKY_COLORS = [
  '#FF0055', '#FF5500', '#FFCC00', '#AAFF00', '#00FF55', 
  '#00FFCC', '#00AAFF', '#0055FF', '#5500FF', '#CC00FF',
  '#FF00CC', '#FF77AA', '#77FFAA', '#77CCFF', '#CCBBFF',
  '#FFFFFF', '#4ADE80', '#3B82F6', '#F43F5E', '#FACC15'
];

// Challenge drawings
const CHALLENGES = {
  house: [
    { id: "1", type: "rect", color: "#0055FF", rotation: 0, params: { x: 12, y: 10, w: 1, h: 1 } },
    { id: "2", type: "rect", color: "#5500FF", rotation: 0, params: { x: 7, y: 10, w: 1, h: 1 } },
    { id: "3", type: "rect", color: "#FFFFFF", rotation: 0, params: { x: 10, y: 12, w: 1, h: 2 } },
    { id: "4", type: "rect", color: "#FACC15", rotation: 0, params: { x: 6, y: 9, w: 8, h: 5 } },
    { id: "5", type: "polygon", color: "#FF0055", rotation: 0, params: { p1x: 4, p1y: 9, p2x: 10, p2y: 5, p3x: 16, p3y: 9 } }
  ],
  fish: [
    { id: "1", type: "circle", color: "#FF00CC", rotation: 0, params: { cx: 4, cy: 10, r: 1 } },
    { id: "2", type: "polygon", color: "#00AAFF", rotation: 0, params: { p1x: 16, p1y: 10, p2x: 19, p2y: 5, p3x: 19, p3y: 15 } },
    { id: "3", type: "polygon", color: "#00AAFF", rotation: 0, params: { p1x: 9, p1y: 15, p2x: 5, p2y: 10, p3x: 8, p3y: 10 } },
    { id: "4", type: "polygon", color: "#00AAFF", rotation: 0, params: { p1x: 7, p1y: 9, p2x: 10, p2y: 5, p3x: 10, p3y: 9 } },
    { id: "5", type: "ellipse", color: "#00AAFF", rotation: 0, params: { x: 1, y: 8, w: 18, h: 4 } }
  ],
  flower: [
    { id: "1", type: "circle", color: "#FACC15", rotation: 0, params: { cx: 10, cy: 10, r: 2 } },
    { id: "2", type: "line", color: "#AAFF00", rotation: 0, params: { x1: 10, y1: 23, x2: 10, y2: 10 } },
    { id: "3", type: "ellipse", color: "#FF77AA", rotation: 0, params: { x: 11, y: 8, w: 8, h: 4 } },
    { id: "4", type: "ellipse", color: "#FF77AA", rotation: 135, params: { x: 9, y: 2, w: 8, h: 4 } },
    { id: "5", type: "ellipse", color: "#FF77AA", rotation: 90, params: { x: 6, y: 1, w: 8, h: 4 } },
    { id: "6", type: "ellipse", color: "#FF77AA", rotation: 45, params: { x: 3, y: 2, w: 8, h: 4 } },
    { id: "7", type: "ellipse", color: "#FF77AA", rotation: 0, params: { x: 1, y: 8, w: 8, h: 4 } }
  ]
};

export default function CodeDrawingGame() {
  const [mode, setMode] = useState('menu'); // 'menu', 'free', 'challenge'
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [shapes, setShapes] = useState([]);
  const [activeShape, setActiveShape] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const startFreeMode = () => {
    setMode('free');
    setShapes([]);
    setActiveShape(null);
    setSelectedChallenge(null);
  };

  const startChallenge = (challengeName) => {
    setMode('challenge');
    setSelectedChallenge(challengeName);
    setShapes([]);
    setActiveShape(null);
  };

  const addShape = (type) => {
    const id = crypto.randomUUID();
    let newShape = {
      id,
      type,
      color: FUNKY_COLORS[Math.floor(Math.random() * 5)],
      rotation: 0,
      params: {}
    };

    if (type === 'circle') newShape.params = { cx: 10, cy: 10, r: 3 };
    if (type === 'rect') newShape.params = { x: 5, y: 5, w: 4, h: 4 };
    if (type === 'ellipse') newShape.params = { x: 5, y: 8, w: 8, h: 4 };
    if (type === 'line') newShape.params = { x1: 2, y1: 2, x2: 10, y2: 10 };
    if (type === 'polygon') newShape.params = { p1x: 5, p1y: 15, p2x: 10, p2y: 5, p3x: 15, p3y: 15 };

    setActiveShape(newShape);
  };

  const updateParam = (k, v) => {
    const updatedShape = { ...activeShape, params: { ...activeShape.params, [k]: parseFloat(v) || 0 } };
    setActiveShape(updatedShape);
    
    const exists = shapes.find(s => s.id === activeShape.id);
    if (exists) {
      setShapes(shapes.map(s => s.id === activeShape.id ? updatedShape : s));
    }
  };

  const updateRotation = (v) => {
    const updatedShape = { ...activeShape, rotation: parseFloat(v) || 0 };
    setActiveShape(updatedShape);
    
    const exists = shapes.find(s => s.id === activeShape.id);
    if (exists) {
      setShapes(shapes.map(s => s.id === activeShape.id ? updatedShape : s));
    }
  };

  const saveShape = () => {
    const exists = shapes.find(s => s.id === activeShape.id);
    if (exists) {
      setShapes(shapes.map(s => s.id === activeShape.id ? activeShape : s));
    } else {
      setShapes([activeShape, ...shapes]);
    }
    setActiveShape(null);
  };

  const copyDrawingCode = async () => {
    const drawingCode = JSON.stringify(shapes, null, 2);
    try {
      await navigator.clipboard.writeText(drawingCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Menu Screen
  if (mode === 'menu') {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center font-mono">
        <div className="text-center">
          <h1 className="text-5xl font-black text-pink-500 italic uppercase mb-8">Shape Lab</h1>
          <div className="space-y-4">
            <button 
              onClick={startFreeMode}
              className="block w-80 bg-emerald-600 hover:bg-emerald-500 py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1"
            >
              🎨 Free Draw Mode
            </button>
            <button 
              onClick={() => startChallenge('house')}
              className="block w-80 bg-pink-600 hover:bg-pink-500 py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1"
            >
              🏠 Challenge: House
            </button>
            <button 
              onClick={() => startChallenge('fish')}
              className="block w-80 bg-blue-600 hover:bg-blue-500 py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1"
            >
              🐟 Challenge: Fish
            </button>
            <button 
              onClick={() => startChallenge('flower')}
              className="block w-80 bg-purple-600 hover:bg-purple-500 py-6 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1"
            >
              🌸 Challenge: Flower
            </button>
          </div>
        </div>
      </div>
    );
  }

  const targetShapes = mode === 'challenge' ? CHALLENGES[selectedChallenge] : [];

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col md:flex-row font-mono overflow-hidden">
      
      {/* LEFT: THE GRID */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 relative select-none">
        <div className="relative w-full aspect-square max-w-[550px] border-2 border-slate-800 bg-[#01040a]">
          {/* Coordinates Labels */}
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`x-${i}`} className="absolute text-[10px] text-slate-600" style={{ left: `${(i*5/GRID)*100}%`, top: '-20px' }}>{i*5}</span>
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`y-${i}`} className="absolute text-[10px] text-slate-600" style={{ left: '-20px', top: `${(i*5/GRID)*100}%` }}>{i*5}</span>
          ))}
          
          <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible cursor-crosshair">
            {/* Grid Lines */}
            {Array.from({ length: GRID + 1 }).map((_, i) => (
              <line key={i} x1={i} y1="0" x2={i} y2={GRID} stroke="#1a202c" strokeWidth="0.05" />
            ))}
            {Array.from({ length: GRID + 1 }).map((_, i) => (
              <line key={i} x1="0" y1={i} x2={GRID} y2={i} stroke="#1a202c" strokeWidth="0.05" />
            ))}

            {/* Challenge Mode: Target Shapes (Outlines Only) */}
            {mode === 'challenge' && targetShapes.map((s) => (
              <g key={`target-${s.id}`}>
                <ShapeRenderer s={s} isOutline={true} />
              </g>
            ))}

            {/* User's Shapes */}
            {[...shapes].reverse().map((s) => (
              <g key={s.id} onClick={() => setActiveShape(s)} className="cursor-pointer group">
                <ShapeRenderer s={s} isSelected={activeShape?.id === s.id} />
                <ShapeRenderer s={s} isHitbox={true} />
                <PointLabels s={s} isSelected={activeShape?.id === s.id} />
              </g>
            ))}

            {/* Active Draft Shape */}
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
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-black text-pink-500 italic uppercase">
              {mode === 'challenge' ? `Challenge: ${selectedChallenge}` : 'Shape Lab'}
            </h1>
            <button 
              onClick={() => setMode('menu')}
              className="text-xs text-slate-500 hover:text-white uppercase font-bold"
            >
              ← Menu
            </button>
          </div>
          
          <div className="flex gap-1 mt-3">
            {['circle', 'rect', 'ellipse', 'line', 'polygon'].map(type => (
              <button key={type} onClick={() => addShape(type)} className="flex-1 bg-slate-800 hover:bg-pink-600 py-2 rounded text-[8px] font-black uppercase transition-all">
                {type}
              </button>
            ))}
          </div>
          
          {/* Copy Drawing Code Button - Only in Free Mode */}
          {mode === 'free' && (
            <button 
              onClick={copyDrawingCode}
              disabled={shapes.length === 0}
              className={`w-full mt-3 py-3 rounded-lg font-black text-xs uppercase transition-all ${
                shapes.length === 0 
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white active:translate-y-1'
              }`}
            >
              {copySuccess ? '✓ Copied!' : '📋 Copy Drawing Code'}
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

                   {/* Color Selector */}
                   <div className="grid grid-cols-10 gap-1 mb-6">
                    {FUNKY_COLORS.map(c => (
                      <button key={c} onClick={() => {
                        const updatedShape = {...activeShape, color: c};
                        setActiveShape(updatedShape);
                        const exists = shapes.find(s => s.id === activeShape.id);
                        if (exists) {
                          setShapes(shapes.map(s => s.id === activeShape.id ? updatedShape : s));
                        }
                      }} className={`w-full aspect-square rounded-sm ${activeShape.color === c ? 'ring-2 ring-white scale-110' : 'opacity-40'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  {/* Number Inputs */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {Object.entries(activeShape.params).map(([k, v]) => (
                      <div key={k} className="bg-slate-800 p-2 rounded">
                        <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">{k}</label>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => updateParam(k, v - 1)}
                            className="bg-slate-700 hover:bg-pink-600 text-white font-black w-7 h-7 rounded flex items-center justify-center transition-all shrink-0"
                          >
                            −
                          </button>
                          <input 
                            type="number" 
                            value={v} 
                            onChange={(e) => updateParam(k, e.target.value)} 
                            className="w-12 bg-slate-900 font-black text-sm outline-none text-pink-400 text-center rounded px-1" 
                          />
                          <button 
                            onClick={() => updateParam(k, v + 1)}
                            className="bg-slate-700 hover:bg-pink-600 text-white font-black w-7 h-7 rounded flex items-center justify-center transition-all shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rotation Control */}
                  <div className="bg-slate-800 p-2 rounded mb-4">
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Rotation (degrees)</label>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => updateRotation((activeShape.rotation || 0) - 15)}
                        className="bg-slate-700 hover:bg-emerald-600 text-white font-black w-8 h-8 rounded flex items-center justify-center transition-all shrink-0"
                      >
                        −
                      </button>
                      <input 
                        type="number" 
                        value={activeShape.rotation || 0} 
                        onChange={(e) => updateRotation(e.target.value)} 
                        className="flex-1 bg-slate-900 font-black text-sm outline-none text-emerald-400 text-center rounded px-2" 
                      />
                      <button 
                        onClick={() => updateRotation((activeShape.rotation || 0) + 15)}
                        className="bg-slate-700 hover:bg-emerald-600 text-white font-black w-8 h-8 rounded flex items-center justify-center transition-all shrink-0"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button onClick={saveShape} className="w-full bg-pink-600 text-white font-black py-4 rounded-xl shadow-lg active:translate-y-1">
                    DONE EDITING
                  </button>
                  <button onClick={() => setActiveShape(null)} className="w-full mt-2 text-slate-500 font-bold text-xs py-2">CANCEL</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="layers" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest">Canvas Layers</p>
                <Reorder.Group axis="y" values={shapes} onReorder={setShapes} className="space-y-2">
                  {shapes.map((s) => (
                    <Reorder.Item key={s.id} value={s} className="bg-slate-800/40 p-3 rounded-lg flex items-center border border-transparent hover:border-pink-500/50">
                      <div className="w-6 h-6 rounded mr-3" style={{ backgroundColor: s.color }} />
                      <div className="flex-1 cursor-pointer" onClick={() => setActiveShape(s)}>
                        <p className="text-[10px] font-black uppercase">{s.type}</p>
                        <p className="text-[8px] text-slate-500 italic">Click to edit</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShapes(shapes.filter(shape => shape.id !== s.id));
                          if (activeShape?.id === s.id) setActiveShape(null);
                        }}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 hover:bg-red-400/10 rounded"
                      >
                        ✕
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                {shapes.length === 0 && <div className="text-center mt-20 text-slate-700 italic text-sm">
                  {mode === 'challenge' ? 'Recreate the outline shapes above!' : 'Grid is empty. Add a shape!'}
                </div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ShapeRenderer({ s, isSelected, isHitbox, isOutline }) {
  const props = {
    fill: isOutline ? 'none' : (isHitbox ? 'transparent' : s.color),
    stroke: isOutline ? '#4ADE80' : (isHitbox ? 'transparent' : (isSelected ? 'white' : 'none')),
    strokeWidth: isOutline ? 0.3 : (isHitbox ? 1 : 0.2),
    strokeDasharray: isOutline ? '0.5,0.5' : undefined,
    className: isSelected && !isHitbox && !isOutline ? "animate-pulse" : "",
    style: { pointerEvents: isHitbox ? 'auto' : 'none' },
    opacity: isOutline ? 0.6 : 1
  };

  // Calculate center for rotation
  let centerX = 0, centerY = 0;
  if (s.type === 'circle') { centerX = s.params.cx; centerY = s.params.cy; }
  else if (s.type === 'rect') { centerX = s.params.x + s.params.w / 2; centerY = s.params.y + s.params.h / 2; }
  else if (s.type === 'ellipse') { centerX = s.params.x + s.params.w / 2; centerY = s.params.y + s.params.h / 2; }
  else if (s.type === 'line') { centerX = (s.params.x1 + s.params.x2) / 2; centerY = (s.params.y1 + s.params.y2) / 2; }
  else if (s.type === 'polygon') { centerX = (s.params.p1x + s.params.p2x + s.params.p3x) / 3; centerY = (s.params.p1y + s.params.p2y + s.params.p3y) / 3; }

  const transform = s.rotation ? `rotate(${s.rotation} ${centerX} ${centerY})` : undefined;

  if (s.type === 'circle') return <circle cx={s.params.cx} cy={s.params.cy} r={s.params.r} transform={transform} {...props} />;
  if (s.type === 'rect') return <rect x={s.params.x} y={s.params.y} width={s.params.w} height={s.params.h} transform={transform} {...props} />;
  if (s.type === 'ellipse') {
    const cx = s.params.x + s.params.w / 2;
    const cy = s.params.y + s.params.h / 2;
    const rx = s.params.w / 2;
    const ry = s.params.h / 2;
    return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={transform} {...props} />;
  }
  if (s.type === 'line') return <line x1={s.params.x1} y1={s.params.y1} x2={s.params.x2} y2={s.params.y2} transform={transform} {...props} stroke={isOutline ? '#4ADE80' : (isHitbox ? 'transparent' : s.color)} strokeWidth={isOutline ? 0.3 : (isHitbox ? 1 : 0.5)} strokeLinecap="round" />;
  if (s.type === 'polygon') return <polygon points={`${s.params.p1x},${s.params.p1y} ${s.params.p2x},${s.params.p2y} ${s.params.p3x},${s.params.p3y}`} transform={transform} {...props} />;
  return null;
}

function PointLabels({ s, isSelected }) {
  if (!isSelected) return null;
  
  if (s.type === 'line') {
    return (
      <>
        <circle cx={s.params.x1} cy={s.params.y1} r="0.3" fill="white" />
        <text x={s.params.x1} y={s.params.y1 - 0.5} fontSize="0.8" fill="white" textAnchor="middle" fontWeight="bold">1</text>
        
        <circle cx={s.params.x2} cy={s.params.y2} r="0.3" fill="white" />
        <text x={s.params.x2} y={s.params.y2 - 0.5} fontSize="0.8" fill="white" textAnchor="middle" fontWeight="bold">2</text>
      </>
    );
  }
  
  if (s.type === 'polygon') {
    return (
      <>
        <circle cx={s.params.p1x} cy={s.params.p1y} r="0.3" fill="white" />
        <text x={s.params.p1x} y={s.params.p1y - 0.5} fontSize="0.8" fill="white" textAnchor="middle" fontWeight="bold">1</text>
        
        <circle cx={s.params.p2x} cy={s.params.p2y} r="0.3" fill="white" />
        <text x={s.params.p2x} y={s.params.p2y - 0.5} fontSize="0.8" fill="white" textAnchor="middle" fontWeight="bold">2</text>
        
        <circle cx={s.params.p3x} cy={s.params.p3y} r="0.3" fill="white" />
        <text x={s.params.p3x} y={s.params.p3y - 0.5} fontSize="0.8" fill="white" textAnchor="middle" fontWeight="bold">3</text>
      </>
    );
  }
  
  return null;
}