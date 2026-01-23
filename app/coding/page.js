'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GRID = 20;
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/* ================= SHAPE LOGIC ================= */
function createShape(existing, enabled) {
  let s;
  let ok = false;
  let attempts = 0;
  while (!ok && attempts < 100) {
    attempts++;
    const type = enabled[rand(0, enabled.length - 1)];
    if (type === 'circle') {
      s = { id: crypto.randomUUID(), type, x: rand(4, 16), y: rand(4, 16), r: rand(2, 3) };
    } else if (type === 'rect') {
      s = { id: crypto.randomUUID(), type, x: rand(2, 14), y: rand(2, 14), w: rand(3, 6), h: rand(3, 6) };
    } else if (type === 'line') {
      const x1 = rand(2, 18), y1 = rand(2, 18);
      let x2 = Math.max(0, Math.min(GRID, x1 + rand(-6, 6)));
      let y2 = Math.max(0, Math.min(GRID, y1 + rand(-6, 6)));
      if (x1 === x2 && y1 === y2) x2 += 2; 
      s = { id: crypto.randomUUID(), type, x1, y1, x2, y2 };
    } else if (type === 'polygon') {
      const p1 = { x: rand(2, 10), y: rand(2, 10) };
      const p2 = { x: p1.x + rand(4, 8), y: p1.y + rand(-2, 2) };
      const p3 = { x: rand(p1.x, p2.x), y: p1.y + rand(4, 8) };
      s = { id: crypto.randomUUID(), type, points: [p1, p2, p3] };
    }
    
    ok = existing.length === 0 || existing.every(e => {
      const ex = e.x || e.x1 || (e.points?.[0].x);
      const ey = e.y || e.y1 || (e.points?.[0].y);
      const sx = s.x || s.x1 || (s.points?.[0].x);
      const sy = s.y || s.y1 || (s.points?.[0].y);
      return Math.hypot(ex - sx, ey - sy) > 7; // Even more space between shapes
    });
  }
  return s;
}

function LabeledCode({ target, mode }) {
  if (!target) return null;
  const isC = mode === 'choose';
  const Param = ({ val, label, color = "text-pink-400" }) => (
    <div className="flex flex-col items-center px-1.5 border-r border-white/5 last:border-0">
      <span className={`text-base md:text-lg font-black ${color}`}>{val}</span>
      <span className="text-[7px] uppercase font-bold text-slate-500">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center bg-black/80 rounded-lg px-3 py-0.5 border border-white/10">
      <span className="text-slate-500 font-bold mr-1 text-xs">{target.type}(</span>
      {target.type === 'circle' && <><Param val={isC ? target.x : 'x'} label="cx" /><Param val={isC ? target.y : 'y'} label="cy" /><Param val={isC ? target.r : 'r'} label="r" color="text-yellow-400" /></>}
      {target.type === 'rect' && <><Param val={isC ? target.x : 'x'} label="x" /><Param val={isC ? target.y : 'y'} label="y" /><Param val={isC ? target.w : 'w'} label="w" color="text-blue-400" /><Param val={isC ? target.h : 'h'} label="h" color="text-blue-400" /></>}
      {target.type === 'line' && <><Param val={isC ? target.x1 : 'x1'} label="x1" color="text-emerald-400" /><Param val={isC ? target.y1 : 'y1'} label="y1" color="text-emerald-400" /><Param val={isC ? target.x2 : 'x2'} label="x2" color="text-emerald-400" /><Param val={isC ? target.y2 : 'y2'} label="y2" color="text-emerald-400" /></>}
      {target.type === 'polygon' && target.points.map((p, i) => (
        <div key={i} className="flex border-r border-white/5 last:border-0">
          <Param val={isC ? p.x : `x${i+1}`} label={`x${i+1}`} color="text-emerald-400" />
          <Param val={isC ? p.y : `y${i+1}`} label={`y${i+1}`} color="text-emerald-400" />
        </div>
      ))}
      <span className="text-slate-500 font-bold ml-0.5 text-xs">)</span>
    </div>
  );
}

export default function DrawWithCode() {
  const [screen, setScreen] = useState('menu');
  const [mode, setMode] = useState(null);
  const [enabledShapes, setEnabledShapes] = useState(['circle', 'rect', 'line', 'polygon']);
  const [shapes, setShapes] = useState([]);
  const [target, setTarget] = useState(null);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [penaltyTime, setPenaltyTime] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => { if (screen === 'game') newRound(); }, [screen]);

  useEffect(() => {
    if (penaltyTime > 0) {
      const timer = setTimeout(() => setPenaltyTime(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (penaltyTime === 0 && feedback === 'wrong') {
      setFeedback(null);
    }
  }, [penaltyTime, feedback]);

  function newRound() {
    const list = [];
    if (mode === 'write') {
      const s = createShape([], enabledShapes);
      list.push(s);
      setTarget(s);
    } else {
      for (let i = 0; i < 3; i++) list.push(createShape(list, enabledShapes));
      setTarget(list[rand(0, list.length - 1)]);
    }
    setShapes(list);
    setAnswer({});
    setIsShaking(false);
  }

  const onSuccess = () => {
    setFeedback('correct');
    setScore(s => s + 1);
    setTimeout(() => { 
      setFeedback(null); 
      if (score + 1 >= 25) setScreen('victory');
      else newRound(); 
    }, 1200);
  };

  const onWrong = () => {
    setIsShaking(true);
    setTimeout(() => { setFeedback('wrong'); setPenaltyTime(10); }, 400);
  };

  const handleCheck = () => {
    let ok = false;
    if (target.type === 'polygon') ok = target.points.every((p, i) => Number(answer[`p${i}x`]) === p.x && Number(answer[`p${i}y`]) === p.y);
    else if (target.type === 'line') ok = (Number(answer.x1) === target.x1 && Number(answer.y1) === target.y1 && Number(answer.x2) === target.x2 && Number(answer.y2) === target.y2);
    else ok = Object.keys(target).filter(k => typeof target[k] === 'number').every(k => Number(answer[k]) === target[k]);
    if (ok) onSuccess(); else onWrong();
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center overflow-hidden font-mono select-none">
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="m-auto w-full max-w-md p-6 text-center">
            <h1 className="text-5xl font-black mb-8 text-pink-500 italic">CODE DRAW</h1>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {['circle', 'rect', 'line', 'polygon'].map(id => (
                <button key={id} onClick={() => setEnabledShapes(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id])}
                  className={`py-3 rounded-lg border-2 transition-all font-bold ${enabledShapes.includes(id) ? 'border-pink-500 bg-pink-500/20' : 'border-slate-800 text-slate-500'}`}>
                  {id === 'polygon' ? 'TRIANGLE' : id.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={() => { setMode('choose'); setScore(0); setScreen('game'); }} className="w-full py-5 bg-white text-black font-black rounded-xl mb-4 text-lg">CLICK MODE</button>
            <button onClick={() => { setMode('write'); setScore(0); setScreen('game'); }} className="w-full py-5 border-2 border-white font-black rounded-xl text-lg hover:bg-white/5">WRITE MODE</button>
          </motion.div>
        )}

        {screen === 'game' && target && (
          <motion.div key="g" className="w-full h-full flex flex-col">
            {/* COMPACT TOP HEADER */}
            <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-white/10 z-20 shrink-0">
              <button onClick={() => setScreen('menu')} className="bg-slate-800 px-3 py-1.5 rounded font-bold text-[10px]">EXIT</button>
              <LabeledCode target={target} mode={mode} />
              <div className="text-sm font-black text-yellow-400">⭐ {score}/25</div>
            </div>

            {/* HORIZONTAL COMMAND ROW (Single line for inputs + button) */}
            <motion.div animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}} className="px-4 py-2 bg-slate-900/60 border-b border-white/5 flex items-center justify-center gap-4 shrink-0 overflow-x-auto no-scrollbar">
              {mode === 'write' ? (
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex gap-2 shrink-0">
                    {target.type === 'circle' && ['x', 'y', 'r'].map(k => (
                      <input key={k} placeholder={k} type="number" value={answer[k] || ''} onChange={e => setAnswer({...answer, [k]: e.target.value})} className="w-10 h-10 bg-black border border-pink-500/30 text-center font-bold rounded" />
                    ))}
                    {target.type === 'rect' && ['x', 'y', 'w', 'h'].map(k => (
                      <input key={k} placeholder={k} type="number" value={answer[k] || ''} onChange={e => setAnswer({...answer, [k]: e.target.value})} className="w-10 h-10 bg-black border border-blue-500/30 text-center font-bold rounded" />
                    ))}
                    {target.type === 'line' && [1, 2].map(num => (
                      <div key={num} className="flex gap-1 bg-slate-800/50 p-1 rounded border border-emerald-500/20">
                        <span className="text-[9px] font-black text-emerald-400 self-center mr-1">P{num}</span>
                        <input placeholder="X" type="number" value={answer[`x${num}`] || ''} onChange={e => setAnswer({...answer, [`x${num}`]: e.target.value})} className="w-10 h-10 bg-black text-center font-bold rounded" />
                        <input placeholder="Y" type="number" value={answer[`y${num}`] || ''} onChange={e => setAnswer({...answer, [`y${num}`]: e.target.value})} className="w-10 h-10 bg-black text-center font-bold rounded" />
                      </div>
                    ))}
                    {target.type === 'polygon' && [1, 2, 3].map(num => (
                      <div key={num} className="flex gap-1 bg-slate-800/50 p-1 rounded border border-emerald-500/20">
                        <span className="text-[9px] font-black text-emerald-400 self-center mr-1">P{num}</span>
                        <input placeholder="X" type="number" value={answer[`p${num-1}x`] || ''} onChange={e => setAnswer({...answer, [`p${num-1}x`]: e.target.value})} className="w-10 h-10 bg-black text-center font-bold rounded" />
                        <input placeholder="Y" type="number" value={answer[`p${num-1}y`] || ''} onChange={e => setAnswer({...answer, [`p${num-1}y`]: e.target.value})} className="w-10 h-10 bg-black text-center font-bold rounded" />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleCheck} className="bg-pink-600 px-6 py-2 rounded font-black text-sm whitespace-nowrap shadow-[0_3px_0_rgb(157,23,77)] active:translate-y-0.5 active:shadow-none">CHECK</button>
                </div>
              ) : (
                <p className="text-slate-500 italic text-xs font-bold py-2">Click the correct shape on the grid!</p>
              )}
            </motion.div>

            {/* BIG GRID AREA */}
            <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
              <div className="relative h-full aspect-square border-2 border-slate-800 rounded-sm bg-[#01040a]">
                {/* AXIS LABELS */}
                {Array.from({ length: GRID + 1 }).map((_, i) => (
                  <div key={i}>
                    <div className="absolute text-[9px] font-bold text-slate-600" style={{ left: `${(i / GRID) * 100}%`, top: '-18px', transform: 'translateX(-50%)' }}>{i}</div>
                    <div className="absolute text-[9px] font-bold text-slate-600" style={{ left: '-18px', top: `${(i / GRID) * 100}%`, transform: 'translateY(-50%)' }}>{i}</div>
                  </div>
                ))}

                <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible pointer-events-none">
                  {Array.from({ length: GRID + 1 }).map((_, i) => (
                    <g key={i}>
                      <line x1={i} y1="0" x2={i} y2={GRID} stroke={i % 5 === 0 ? "#2d3748" : "#1a202c"} strokeWidth="0.08" />
                      <line x1="0" y1={i} x2={GRID} y2={i} stroke={i % 5 === 0 ? "#2d3748" : "#1a202c"} strokeWidth="0.08" />
                    </g>
                  ))}

                  <AnimatePresence>
                    {shapes.map(s => (
                      <motion.g key={s.id} animate={feedback === 'correct' ? { scale: [1, 1.15, 1] } : {}}>
                        {s.type === 'circle' && <circle cx={s.x} cy={s.y} r={s.r} fill={feedback === 'correct' ? "#4ADE80" : "#f43f5e"} fillOpacity="0.75" onClick={() => handleGridClick(s)} className="cursor-pointer pointer-events-auto" />}
                        {s.type === 'rect' && <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={feedback === 'correct' ? "#4ADE80" : "#3b82f6"} fillOpacity="0.75" onClick={() => handleGridClick(s)} className="cursor-pointer pointer-events-auto" />}
                        {s.type === 'line' && (
                          <g className="pointer-events-auto cursor-pointer" onClick={() => handleGridClick(s)}>
                            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={feedback === 'correct' ? "#4ADE80" : "white"} strokeWidth="0.5" strokeLinecap="round" />
                            {mode === 'write' && (
                              <>
                                <circle cx={s.x1} cy={s.y1} r="0.25" fill="white" />
                                <text x={s.x1} y={s.y1 - 0.6} fontSize="1.1" fill="#10B981" fontWeight="900" textAnchor="middle" stroke="black" strokeWidth="0.1">P1</text>
                                <circle cx={s.x2} cy={s.y2} r="0.25" fill="white" />
                                <text x={s.x2} y={s.y2 - 0.6} fontSize="1.1" fill="#10B981" fontWeight="900" textAnchor="middle" stroke="black" strokeWidth="0.1">P2</text>
                              </>
                            )}
                          </g>
                        )}
                        {s.type === 'polygon' && (
                          <g className="pointer-events-auto cursor-pointer" onClick={() => handleGridClick(s)}>
                            <polygon points={s.points.map(p => `${p.x},${p.y}`).join(' ')} fill={feedback === 'correct' ? "#4ADE80" : "#22c55e"} fillOpacity="0.75" />
                            {mode === 'write' && s.points.map((p, i) => (
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r="0.25" fill="white" />
                                <text x={p.x} y={p.y - 0.6} fontSize="1.1" fill="#10B981" fontWeight="900" textAnchor="middle" stroke="black" strokeWidth="0.1">P{i + 1}</text>
                              </g>
                            ))}
                          </g>
                        )}
                      </motion.g>
                    ))}
                  </AnimatePresence>
                </svg>

                {/* OVERLAYS */}
                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-green-500/10 backdrop-blur-sm z-50 pointer-events-none">
                      <h2 className="text-4xl font-black text-green-400 italic drop-shadow-lg uppercase">Excellent!</h2>
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/95 z-50 border-4 border-red-600">
                      <h2 className="text-2xl font-black mb-4">LOCKED OUT!</h2>
                      <div className="relative flex items-center justify-center scale-90">
                        <svg className="w-20 h-20 transform -rotate-90"><circle cx="40" cy="40" r="36" stroke="white" strokeOpacity="0.1" strokeWidth="4" fill="transparent" /><motion.circle cx="40" cy="40" r="36" stroke="#f43f5e" strokeWidth="4" fill="transparent" strokeDasharray="226" initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: 226 }} transition={{ duration: 10, ease: "linear" }} /></svg>
                        <span className="absolute text-3xl font-black">{penaltyTime}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}