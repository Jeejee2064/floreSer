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
      s = { id: crypto.randomUUID(), type, x1, y1, x2: x1 + rand(-5, 5), y2: y1 + rand(-5, 5) };
    } else if (type === 'polygon') {
      const x = rand(5, 14), y = rand(5, 14);
      s = { id: crypto.randomUUID(), type, points: [{ x, y }, { x: x + 5, y }, { x: x + 2, y: y + 4 }] };
    }
    ok = existing.length === 0 || existing.every(e => Math.hypot((e.x || e.x1) - (s.x || s.x1), (e.y || e.y1) - (s.y || s.y1)) > 5);
  }
  return s;
}

function getDisplayCode(s, mode) {
  if (!s) return '';
  const isC = mode === 'choose';
  if (s.type === 'circle') return `circle(${isC ? s.x : 'x'}, ${isC ? s.y : 'y'}, ${isC ? s.r : 'r'})`;
  if (s.type === 'rect') return `rect(${isC ? s.x : 'x'}, ${isC ? s.y : 'y'}, ${isC ? s.w : 'w'}, ${isC ? s.h : 'h'})`;
  if (s.type === 'line') return `line((${isC ? s.x1 : 'x1'}, ${isC ? s.y1 : 'y1'}), (${isC ? s.x2 : 'x2'}, ${isC ? s.y2 : 'y2'}))`;
  if (s.type === 'polygon') {
    const pts = isC ? s.points.map(p => `(${p.x},${p.y})`).join(', ') : 'p1, p2, p3';
    return `polygon([${pts}])`;
  }
  return '';
}

export default function DrawWithCode() {
  const [screen, setScreen] = useState('menu');
  const [mode, setMode] = useState(null);
  const [enabledShapes, setEnabledShapes] = useState(['circle', 'rect']);
  const [shapes, setShapes] = useState([]);
  const [target, setTarget] = useState(null);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [penaltyTime, setPenaltyTime] = useState(0);

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
  }

  const onSuccess = () => {
    setScore(s => s + 1);
    setFeedback('correct');
    setTimeout(() => { 
      setFeedback(null); 
      if (score + 1 >= 25) {
        setScreen('victory');
      } else {
        newRound(); 
      }
    }, 800);
  };

  const onWrong = () => {
    setFeedback('wrong');
    setPenaltyTime(10);
  };

  const handleGridClick = (clickedShape) => {
    if (penaltyTime > 0 || feedback) return;
    if (mode === 'choose') {
      if (clickedShape.id === target.id) onSuccess();
      else onWrong();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center overflow-hidden font-mono select-none">
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="m-auto w-full max-w-md p-6 text-center">
            <h1 className="text-5xl font-black mb-8 text-pink-500 italic">CODE DRAW</h1>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {['circle', 'rect', 'line', 'polygon'].map(id => (
                <button key={id} onClick={() => setEnabledShapes(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id])}
                  className={`py-4 rounded-xl border-2 transition-all font-bold ${enabledShapes.includes(id) ? 'border-pink-500 bg-pink-500/10' : 'border-slate-700'}`}>
                  {id.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={() => { setMode('choose'); setScore(0); setScreen('game'); }} className="w-full py-5 bg-white text-black font-black rounded-2xl mb-4 text-xl shadow-xl">CLICK MODE</button>
            <button onClick={() => { setMode('write'); setScore(0); setScreen('game'); }} className="w-full py-5 border-2 border-white font-black rounded-2xl text-xl shadow-xl">WRITE MODE</button>
          </motion.div>
        )}

        {screen === 'game' && (
          <motion.div key="g" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full flex flex-col">
            
            <div className="flex justify-between items-center p-3 bg-slate-900 border-b border-white/10 z-20">
              <button onClick={() => setScreen('menu')} className="bg-slate-800 px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-700">EXIT</button>
              <div className="bg-black/60 px-4 py-2 rounded-lg border border-pink-500/50 text-pink-400 text-sm md:text-lg font-bold">
                {getDisplayCode(target, mode)}
              </div>
              <div className="text-xl font-black text-yellow-400">⭐ {score}/25</div>
            </div>

            <div className="p-3 flex flex-wrap items-center justify-center gap-4 bg-slate-900/30 min-h-[110px] z-10">
              {mode === 'write' ? (
                <div className="flex flex-wrap justify-center gap-2 items-end">
                  {target.type === 'polygon' ? (
                      target.points.map((p, i) => (
                        <div key={i} className="flex gap-1 bg-slate-800/80 p-2 rounded-xl border border-white/10 shadow-lg">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-green-400">P{i+1} X</span>
                            <input type="number" inputMode="numeric" value={answer[`p${i}x`] || ''} onChange={e => setAnswer({...answer, [`p${i}x`]: e.target.value})} className="w-11 h-11 bg-black rounded-lg text-center font-bold outline-none border border-slate-700 focus:border-green-500" />
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-green-400">P{i+1} Y</span>
                            <input type="number" inputMode="numeric" value={answer[`p${i}y`] || ''} onChange={e => setAnswer({...answer, [`p${i}y`]: e.target.value})} className="w-11 h-11 bg-black rounded-lg text-center font-bold outline-none border border-slate-700 focus:border-green-500" />
                          </div>
                        </div>
                      ))
                    ) : (
                      Object.keys(target).filter(k => typeof target[k] === 'number').map(k => (
                        <div key={k} className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-pink-500 mb-1 uppercase tracking-widest">{k}</span>
                          <input type="number" inputMode="numeric" value={answer[k] || ''} 
                            onChange={e => setAnswer({...answer, [k]: e.target.value})}
                            className="w-14 h-14 bg-slate-800 border-2 border-slate-600 rounded-xl text-center text-xl font-bold outline-none focus:border-pink-500" />
                        </div>
                      ))
                    )}
                  <button onClick={() => {
                     let ok = false;
                     if (target.type === 'polygon') {
                       ok = target.points.every((p, i) => Number(answer[`p${i}x`]) === p.x && Number(answer[`p${i}y`]) === p.y);
                     } else {
                       ok = Object.keys(target).filter(k => typeof target[k] === 'number').every(k => Number(answer[k]) === target[k]);
                     }
                    if (ok) onSuccess(); else onWrong();
                  }} className="bg-pink-600 px-8 rounded-xl font-black h-14 text-lg shadow-lg active:scale-90 transition-transform">CHECK</button>
                </div>
              ) : (
                <p className="text-slate-400 italic text-sm font-bold opacity-60">Study the coordinates carefully before clicking!</p>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center p-8 min-h-0 relative">
              <div className="relative h-full aspect-square bg-[#020617] border-[3px] border-slate-700 rounded-sm">
                
                {/* AXIS LABELS - X TOP / Y LEFT */}
                {Array.from({ length: GRID + 1 }).map((_, i) => (
                  <div key={i}>
                    <div className="absolute text-[11px] font-bold text-slate-400" style={{ left: `${(i / GRID) * 100}%`, top: '-25px', transform: 'translateX(-50%)' }}>{i}</div>
                    <div className="absolute text-[11px] font-bold text-slate-400" style={{ left: '-25px', top: `${(i / GRID) * 100}%`, transform: 'translateY(-50%)' }}>{i}</div>
                  </div>
                ))}

                <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible pointer-events-none">
                  {Array.from({ length: GRID + 1 }).map((_, i) => (
                    <g key={i}>
                      <line x1={i} y1="0" x2={i} y2={GRID} stroke={i % 5 === 0 ? "#475569" : "#1e293b"} strokeWidth={i % 5 === 0 ? "0.15" : "0.06"} />
                      <line x1="0" y1={i} x2={GRID} y2={i} stroke={i % 5 === 0 ? "#475569" : "#1e293b"} strokeWidth={i % 5 === 0 ? "0.15" : "0.06"} />
                    </g>
                  ))}

                  <AnimatePresence>
                    {shapes.map(s => (
                      <motion.g key={s.id} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        {s.type === 'circle' && <circle cx={s.x} cy={s.y} r={s.r} fill="#f43f5e" fillOpacity="0.75" onClick={() => handleGridClick(s)} className="cursor-pointer pointer-events-auto" />}
                        {s.type === 'rect' && <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="#3b82f6" fillOpacity="0.75" onClick={() => handleGridClick(s)} className="cursor-pointer pointer-events-auto" />}
                        {s.type === 'line' && (
                          <g className="pointer-events-auto cursor-pointer" onClick={() => handleGridClick(s)}>
                            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="white" strokeWidth="0.5" strokeLinecap="round" />
                            {mode === 'write' && (
                              <><text x={s.x1} y={s.y1 - 0.7} fontSize="1.3" fill="#4ADE80" fontWeight="black" stroke="black" strokeWidth="0.1" paintOrder="stroke">1</text>
                                <text x={s.x2} y={s.y2 - 0.7} fontSize="1.3" fill="#4ADE80" fontWeight="black" stroke="black" strokeWidth="0.1" paintOrder="stroke">2</text></>
                            )}
                          </g>
                        )}
                        {s.type === 'polygon' && (
                          <g className="pointer-events-auto cursor-pointer" onClick={() => handleGridClick(s)}>
                            <polygon points={s.points.map(p => `${p.x},${p.y}`).join(' ')} fill="#22c55e" fillOpacity="0.75" />
                            {mode === 'write' && s.points.map((p, i) => (
                              <text key={i} x={p.x} y={p.y - 0.7} fontSize="1.3" fill="white" fontWeight="black" textAnchor="middle" stroke="black" strokeWidth="0.1" paintOrder="stroke">{i + 1}</text>
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-[2px] z-50">
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 2 }} className="text-9xl drop-shadow-2xl">🌟</motion.span>
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/95 backdrop-blur-2xl z-50 p-6 text-center">
                      <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} className="text-7xl mb-6">🛑</motion.div>
                      <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">WAIT!</h2>
                      <p className="text-red-400 text-lg mb-8 font-bold leading-tight">
                        Are you trying to click everywhere <br/> to be faster?
                      </p>
                      
                      <div className="relative flex items-center justify-center">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" />
                          <motion.circle cx="64" cy="64" r="58" stroke="#f43f5e" strokeWidth="8" fill="transparent"
                            strokeDasharray="364.4" initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: 364.4 }} transition={{ duration: 10, ease: "linear" }}
                          />
                        </svg>
                        <span className="absolute text-5xl font-black text-white">{penaltyTime}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'victory' && (
          <motion.div key="v" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="m-auto text-center flex flex-col items-center">
            <motion.div animate={{ y: [0, -20, 0], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="text-[12rem] mb-4">🏆</motion.div>
            <h1 className="text-7xl font-black text-yellow-400 mb-2 tracking-tighter shadow-yellow-500/20">PERFECT!</h1>
            <p className="text-slate-300 text-2xl font-bold uppercase tracking-widest mb-10">25 / 25 COORDINATE MASTER</p>
            <button onClick={() => { setScore(0); setScreen('menu'); }} className="px-16 py-6 bg-pink-600 hover:bg-pink-500 text-white rounded-full font-black text-3xl transition-all shadow-[0_0_40px_rgba(219,39,119,0.4)] active:scale-95">
              PLAY AGAIN
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}