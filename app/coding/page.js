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
      // Ensure line has some length
      const x2 = x1 + rand(-5, 5);
      const y2 = y1 + rand(-5, 5);
      s = { id: crypto.randomUUID(), type, x1, y1, x2: x2 === x1 ? x2 + 2 : x2, y2: y2 === y1 ? y2 + 2 : y2 };
    } else if (type === 'polygon') {
      const p1 = { x: rand(2, 10), y: rand(2, 10) };
      const p2 = { x: p1.x + rand(4, 8), y: p1.y + rand(-1, 1) };
      const p3 = { x: rand(p1.x, p2.x), y: p1.y + rand(4, 8) };
      s = { id: crypto.randomUUID(), type, points: [p1, p2, p3] };
    }
    ok = existing.length === 0 || existing.every(e => Math.hypot((e.x || e.x1) - (s.x || s.x1), (e.y || e.y1) - (s.y || s.y1)) > 4);
  }
  return s;
}

function LabeledCode({ target, mode }) {
  if (!target) return null;
  const isC = mode === 'choose';
  const Param = ({ val, label, color = "text-pink-400" }) => (
    <div className="flex flex-col items-center px-2 border-r border-white/10 last:border-0">
      <span className={`text-lg md:text-xl font-black ${color}`}>{val}</span>
      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-tighter">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center bg-black/40 rounded-xl px-4 py-1 border border-white/10 shadow-inner">
      <span className="text-slate-400 font-bold mr-2">{target.type}(</span>
      {target.type === 'circle' && <><Param val={isC ? target.x : 'x'} label="center x" /><Param val={isC ? target.y : 'y'} label="center y" /><Param val={isC ? target.r : 'r'} label="radius" color="text-yellow-400" /></>}
      {target.type === 'rect' && <><Param val={isC ? target.x : 'x'} label="x" /><Param val={isC ? target.y : 'y'} label="y" /><Param val={isC ? target.w : 'w'} label="width" color="text-blue-400" /><Param val={isC ? target.h : 'h'} label="height" color="text-blue-400" /></>}
      {target.type === 'line' && <><Param val={isC ? target.x1 : 'x1'} label="p1 x" color="text-green-400" /><Param val={isC ? target.y1 : 'y1'} label="p1 y" color="text-green-400" /><Param val={isC ? target.x2 : 'x2'} label="p2 x" color="text-green-400" /><Param val={isC ? target.y2 : 'y2'} label="p2 y" color="text-green-400" /></>}
      {target.type === 'polygon' && target.points.map((p, i) => <div key={i} className="flex border-r border-white/5 last:border-0"><Param val={isC ? p.x : `p${i+1}x`} label={`p${i+1} x`} color="text-emerald-400" /><Param val={isC ? p.y : `p${i+1}y`} label={`p${i+1} y`} color="text-emerald-400" /></div>)}
      <span className="text-slate-400 font-bold ml-1">)</span>
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
    }, 1500);
  };

  const onWrong = () => {
    setIsShaking(true);
    setTimeout(() => {
      setFeedback('wrong');
      setPenaltyTime(10);
    }, 400);
  };

  const handleGridClick = (clickedShape) => {
    if (penaltyTime > 0 || feedback) return;
    if (mode === 'choose') {
      if (clickedShape.id === target?.id) onSuccess();
      else onWrong();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center overflow-hidden font-mono select-none">
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="m-auto w-full max-w-md p-6 text-center">
            <h1 className="text-6xl font-black mb-8 text-pink-500 italic drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]">CODE DRAW</h1>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {['circle', 'rect', 'line', 'polygon'].map(id => (
                <button key={id} onClick={() => setEnabledShapes(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id])}
                  className={`py-4 rounded-xl border-2 transition-all font-bold ${enabledShapes.includes(id) ? 'border-pink-500 bg-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'border-slate-800 text-slate-500'}`}>
                  {id === 'polygon' ? 'TRIANGLE' : id.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={() => { setMode('choose'); setScore(0); setScreen('game'); }} className="w-full py-6 bg-white text-black font-black rounded-2xl mb-4 text-xl shadow-2xl active:scale-95 transition-all">CLICK MODE</button>
            <button onClick={() => { setMode('write'); setScore(0); setScreen('game'); }} className="w-full py-6 border-2 border-white font-black rounded-2xl text-xl hover:bg-white/10 transition-all">WRITE MODE</button>
          </motion.div>
        )}

        {screen === 'game' && target && (
          <motion.div key="g" className="w-full h-full flex flex-col">
            <div className="flex justify-between items-center p-3 bg-slate-900 border-b border-white/10 z-20">
              <button onClick={() => { setScreen('menu'); setTarget(null); }} className="bg-slate-800 px-4 py-2 rounded-lg font-bold text-xs hover:bg-red-500/40">EXIT</button>
              <LabeledCode target={target} mode={mode} />
              <div className="text-xl font-black text-yellow-400 bg-black/40 px-3 py-1 rounded-full border border-yellow-400/30">⭐ {score}/25</div>
            </div>

            <motion.div animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}} className="p-3 flex flex-wrap items-center justify-center gap-4 bg-slate-900/30 min-h-[110px] z-10">
              {mode === 'write' ? (
                <div className="flex flex-wrap justify-center gap-2 items-end">
                   {target.type === 'polygon' ? (
                      target.points.map((p, i) => (
                        <div key={i} className="flex gap-1 bg-slate-800/80 p-2 rounded-xl border border-emerald-500/30 shadow-lg scale-90 md:scale-100">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-emerald-400">P{i+1} X</span>
                            <input type="number" value={answer[`p${i}x`] || ''} onChange={e => setAnswer({...answer, [`p${i}x`]: e.target.value})} className="w-11 h-11 bg-black rounded-lg text-center font-bold focus:ring-2 ring-emerald-500 outline-none" />
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black text-emerald-400">P{i+1} Y</span>
                            <input type="number" value={answer[`p${i}y`] || ''} onChange={e => setAnswer({...answer, [`p${i}y`]: e.target.value})} className="w-11 h-11 bg-black rounded-lg text-center font-bold focus:ring-2 ring-emerald-500 outline-none" />
                          </div>
                        </div>
                      ))
                    ) : (
                      Object.keys(target).filter(k => typeof target[k] === 'number').map(k => (
                        <div key={k} className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-pink-500 mb-1 uppercase tracking-widest">{k}</span>
                          <input type="number" value={answer[k] || ''} onChange={e => setAnswer({...answer, [k]: e.target.value})}
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
                  }} className="bg-pink-600 px-8 rounded-xl font-black h-14 text-lg shadow-[0_5px_0_rgb(157,23,77)] active:translate-y-1 active:shadow-none transition-all">CHECK ANSWER</button>
                </div>
              ) : (
                <p className="text-slate-400 italic text-sm font-bold opacity-60 px-4 text-center">Analyze the code above to find the shape!</p>
              )}
            </motion.div>

            <div className="flex-1 flex items-center justify-center p-8 min-h-0 relative">
              <div className="relative h-full aspect-square bg-[#020617] border-[3px] border-slate-700 rounded-sm">
                {/* AXIS LABELS */}
                {Array.from({ length: GRID + 1 }).map((_, i) => (
                  <div key={i}>
                    <div className="absolute text-[11px] font-bold text-slate-400" style={{ left: `${(i / GRID) * 100}%`, top: '-25px', transform: 'translateX(-50%)' }}>{i}</div>
                    <div className="absolute text-[11px] font-bold text-slate-400" style={{ left: '-25px', top: `${(i / GRID) * 100}%`, transform: 'translateY(-50%)' }}>{i}</div>
                  </div>
                ))}

                <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible pointer-events-none">
                  {/* Grid */}
                  {Array.from({ length: GRID + 1 }).map((_, i) => (
                    <g key={i}>
                      <line x1={i} y1="0" x2={i} y2={GRID} stroke={i % 5 === 0 ? "#475569" : "#1e293b"} strokeWidth={i % 5 === 0 ? "0.15" : "0.06"} />
                      <line x1="0" y1={i} x2={GRID} y2={i} stroke={i % 5 === 0 ? "#475569" : "#1e293b"} strokeWidth={i % 5 === 0 ? "0.15" : "0.06"} />
                    </g>
                  ))}

                  <AnimatePresence>
                    {shapes.map(s => (
                      <motion.g key={s.id} animate={feedback === 'correct' ? { scale: [1, 1.2, 1], filter: ["brightness(1)", "brightness(2)", "brightness(1)"] } : {}}>
                        {s.type === 'circle' && <circle cx={s.x} cy={s.y} r={s.r} fill={feedback === 'correct' ? "#4ADE80" : "#f43f5e"} fillOpacity="0.75" onClick={() => handleGridClick(s)} className="cursor-pointer pointer-events-auto" />}
                        {s.type === 'rect' && <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={feedback === 'correct' ? "#4ADE80" : "#3b82f6"} fillOpacity="0.75" onClick={() => handleGridClick(s)} className="cursor-pointer pointer-events-auto" />}
                        
                        {s.type === 'line' && (
                          <g className="pointer-events-auto cursor-pointer" onClick={() => handleGridClick(s)}>
                            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={feedback === 'correct' ? "#4ADE80" : "white"} strokeWidth="0.5" strokeLinecap="round" />
                            {/* NEW LINE LABELS */}
                            {mode === 'write' && (
                              <>
                                <circle cx={s.x1} cy={s.y1} r="0.3" fill="white" />
                                <text x={s.x1} y={s.y1 - 0.8} fontSize="1.2" fill="#34d399" fontWeight="900" textAnchor="middle" stroke="black" strokeWidth="0.1" paintOrder="stroke">P1</text>
                                <circle cx={s.x2} cy={s.y2} r="0.3" fill="white" />
                                <text x={s.x2} y={s.y2 - 0.8} fontSize="1.2" fill="#34d399" fontWeight="900" textAnchor="middle" stroke="black" strokeWidth="0.1" paintOrder="stroke">P2</text>
                              </>
                            )}
                          </g>
                        )}

                        {s.type === 'polygon' && (
                          <g className="pointer-events-auto cursor-pointer" onClick={() => handleGridClick(s)}>
                            <polygon points={s.points.map(p => `${p.x},${p.y}`).join(' ')} fill={feedback === 'correct' ? "#4ADE80" : "#22c55e"} fillOpacity="0.75" />
                            {mode === 'write' && s.points.map((p, i) => (
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r="0.3" fill="white" />
                                <text x={p.x} y={p.y - 0.8} fontSize="1.2" fill="#34d399" fontWeight="900" textAnchor="middle" stroke="black" strokeWidth="0.1" paintOrder="stroke">P{i + 1}</text>
                              </g>
                            ))}
                          </g>
                        )}
                      </motion.g>
                    ))}
                  </AnimatePresence>
                </svg>

                {/* FEEDBACK OVERLAYS */}
                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/10 backdrop-blur-[2px] z-50 pointer-events-none">
                      <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.5, 1] }} className="text-9xl mb-4 text-center">✨</motion.div>
                      <h2 className="text-5xl font-black text-green-400 italic text-center px-4 drop-shadow-[0_0_15px_rgba(74,222,128,1)]">CODE MASTER!</h2>
                    </motion.div>
                  )}
                  {feedback === 'wrong' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/95 backdrop-blur-2xl z-50 p-6 text-center border-8 border-red-600">
                      <h2 className="text-4xl font-black text-white mb-4 italic uppercase tracking-tighter">Wait Up!</h2>
                      <p className="text-red-400 text-xl mb-10 font-bold leading-tight">Looks like a coordinate typo. <br/> Check the labels again!</p>
                      <div className="relative flex items-center justify-center scale-125">
                        <svg className="w-32 h-32 transform -rotate-90"><circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="transparent" /><motion.circle cx="64" cy="64" r="58" stroke="#f43f5e" strokeWidth="8" fill="transparent" strokeDasharray="364.4" initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: 364.4 }} transition={{ duration: 10, ease: "linear" }} /></svg>
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
          <motion.div key="v" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="m-auto text-center flex flex-col items-center">
            <motion.div animate={{ rotateY: [0, 360], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="text-[10rem] mb-6 drop-shadow-[0_0_40px_rgba(234,179,8,0.5)]">🏆</motion.div>
            <h1 className="text-7xl font-black text-yellow-400 mb-2 italic">WINNER!</h1>
            <p className="text-slate-300 text-2xl font-bold mb-12 uppercase tracking-widest">25 Challenges Completed</p>
            <button onClick={() => { setScore(0); setScreen('menu'); setTarget(null); }} className="px-16 py-7 bg-gradient-to-r from-pink-600 to-purple-700 text-white rounded-full font-black text-3xl shadow-2xl active:scale-95 transition-all">PLAY AGAIN</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}