'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, animate as fmAnimate } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GRID = 20;

// ── ANIMATION ─────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

function springTo(from, to, setter) {
  return new Promise(resolve => {
    fmAnimate(from, to, {
      type: 'spring', stiffness: 260, damping: 11, mass: 0.85,
      onUpdate: v => setter(v), onComplete: resolve,
    });
  });
}

// ── HELPERS ────────────────────────────────────────────────────────
function applyOffset(s, dx, dy, rotation) {
  const p = { ...s.params };
  const xK = { circle:['cx'], rect:['x'], ellipse:['x'], line:['x1','x2'], polygon:['p1x','p2x','p3x'] };
  const yK = { circle:['cy'], rect:['y'], ellipse:['y'], line:['y1','y2'], polygon:['p1y','p2y','p3y'] };
  for (const k of (xK[s.type]||[])) if (k in p) p[k] += dx;
  for (const k of (yK[s.type]||[])) if (k in p) p[k] += dy;
  return { ...s, params: p, rotation: (s.rotation||0) + rotation };
}

function ShapeRenderer({ s, isOutline, isSuccess }) {
  let cx=0, cy=0;
  if (s.type==='circle')  { cx=s.params.cx; cy=s.params.cy; }
  if (s.type==='rect')    { cx=s.params.x+s.params.w/2; cy=s.params.y+s.params.h/2; }
  if (s.type==='ellipse') { cx=s.params.x+s.params.w/2; cy=s.params.y+s.params.h/2; }
  if (s.type==='line')    { cx=(s.params.x1+s.params.x2)/2; cy=(s.params.y1+s.params.y2)/2; }
  if (s.type==='polygon') { cx=(s.params.p1x+s.params.p2x+s.params.p3x)/3; cy=(s.params.p1y+s.params.p2y+s.params.p3y)/3; }
  const transform = s.rotation ? `rotate(${s.rotation} ${cx} ${cy})` : undefined;
  const fill  = isOutline ? 'none'    : isSuccess ? '#4ADE80' : s.color;
  const stroke= isOutline ? '#4ADE80' : isSuccess ? '#fff'    : 'none';
  const sh = { fill, stroke, strokeWidth:isOutline?0.28:0.15, strokeDasharray:isOutline?'0.5,0.4':undefined, opacity:isOutline?0.55:1, transform, style:{pointerEvents:'none'} };
  if (s.type==='circle')  return <circle  cx={s.params.cx} cy={s.params.cy} r={s.params.r} {...sh}/>;
  if (s.type==='rect')    return <rect    x={s.params.x} y={s.params.y} width={s.params.w} height={s.params.h} {...sh}/>;
  if (s.type==='ellipse') return <ellipse cx={cx} cy={cy} rx={s.params.w/2} ry={s.params.h/2} {...sh}/>;
  if (s.type==='line')    return <line    x1={s.params.x1} y1={s.params.y1} x2={s.params.x2} y2={s.params.y2} {...sh} strokeWidth={isOutline?0.28:0.45} strokeLinecap="round"/>;
  if (s.type==='polygon') return <polygon points={`${s.params.p1x},${s.params.p1y} ${s.params.p2x},${s.params.p2y} ${s.params.p3x},${s.params.p3y}`} {...sh}/>;
  return null;
}

// ── LEVELS ─────────────────────────────────────────────────────────
const LEVELS = [
  { group:'Translate X', hint:'Use translateX() to move the shape right', shape:{type:'rect',color:'#3B82F6',rotation:0,params:{x:1,y:8,w:4,h:4}}, target:{dx:10,dy:0,rotation:0} },
  { group:'Translate X', hint:'Same idea — how far this time?', shape:{type:'ellipse',color:'#3B82F6',rotation:0,params:{x:1,y:7,w:5,h:6}}, target:{dx:12,dy:0,rotation:0} },
  { group:'Translate X', hint:'Negative translateX moves LEFT', shape:{type:'polygon',color:'#3B82F6',rotation:0,params:{p1x:14,p1y:5,p2x:19,p2y:10,p3x:14,p3y:15}}, target:{dx:-12,dy:0,rotation:0} },
  { group:'Translate Y', hint:'Use translateY() to move the shape down', shape:{type:'rect',color:'#A855F7',rotation:0,params:{x:8,y:1,w:4,h:4}}, target:{dx:0,dy:12,rotation:0} },
  { group:'Translate Y', hint:'Drop the circle down to the ghost', shape:{type:'circle',color:'#A855F7',rotation:0,params:{cx:10,cy:4,r:3}}, target:{dx:0,dy:10,rotation:0} },
  { group:'Translate Y', hint:'Negative translateY moves UP', shape:{type:'ellipse',color:'#A855F7',rotation:0,params:{x:7,y:14,w:6,h:4}}, target:{dx:0,dy:-10,rotation:0} },
  { group:'X and Y', hint:'You need both translateX and translateY', shape:{type:'rect',color:'#AAFF00',rotation:0,params:{x:1,y:1,w:4,h:4}}, target:{dx:12,dy:12,rotation:0} },
  { group:'X and Y', hint:'One axis is negative this time', shape:{type:'ellipse',color:'#AAFF00',rotation:0,params:{x:12,y:1,w:6,h:4}}, target:{dx:-9,dy:11,rotation:0} },
  { group:'X and Y', hint:'Both axes are negative — up and left', shape:{type:'polygon',color:'#AAFF00',rotation:0,params:{p1x:13,p1y:13,p2x:19,p2y:19,p3x:13,p3y:19}}, target:{dx:-11,dy:-11,rotation:0} },
  { group:'Rotation', hint:'Use rotate() — values are in degrees', shape:{type:'rect',color:'#F43F5E',rotation:0,params:{x:8,y:7,w:4,h:8}}, target:{dx:0,dy:0,rotation:45} },
  { group:'Rotation', hint:'A 90° rotation flips the ellipse on its side', shape:{type:'ellipse',color:'#F43F5E',rotation:0,params:{x:6,y:9,w:8,h:2}}, target:{dx:0,dy:0,rotation:90} },
  { group:'Rotation', hint:'Negative rotation = counter-clockwise', shape:{type:'polygon',color:'#F43F5E',rotation:0,params:{p1x:10,p1y:3,p2x:17,p2y:17,p3x:3,p3y:17}}, target:{dx:0,dy:0,rotation:-60} },
  { group:'X + Rotation', hint:'Move horizontally AND rotate to match', shape:{type:'rect',color:'#FF5500',rotation:0,params:{x:1,y:7,w:4,h:6}}, target:{dx:12,dy:0,rotation:45} },
  { group:'X + Rotation', hint:'Shift left and rotate', shape:{type:'ellipse',color:'#FF5500',rotation:0,params:{x:13,y:8,w:6,h:3}}, target:{dx:-9,dy:0,rotation:90} },
  { group:'X + Rotation', hint:'A larger rotation this time', shape:{type:'polygon',color:'#FF5500',rotation:0,params:{p1x:2,p1y:7,p2x:8,p2y:2,p3x:8,p3y:12}}, target:{dx:8,dy:0,rotation:120} },
  { group:'Y + Rotation', hint:'Move vertically AND rotate', shape:{type:'rect',color:'#00FFCC',rotation:0,params:{x:8,y:1,w:4,h:4}}, target:{dx:0,dy:12,rotation:45} },
  { group:'Y + Rotation', hint:'Move up and spin it', shape:{type:'ellipse',color:'#00FFCC',rotation:0,params:{x:7,y:14,w:6,h:3}}, target:{dx:0,dy:-10,rotation:60} },
  { group:'Y + Rotation', hint:'Triangle drops down and rotates', shape:{type:'polygon',color:'#00FFCC',rotation:0,params:{p1x:5,p1y:2,p2x:15,p2y:2,p3x:10,p3y:8}}, target:{dx:0,dy:9,rotation:90} },
  { group:'X + Y + Rotation', hint:'All three transforms — figure them out!', shape:{type:'rect',color:'#FF77AA',rotation:0,params:{x:1,y:1,w:4,h:6}}, target:{dx:12,dy:11,rotation:45} },
  { group:'X + Y + Rotation', hint:'Negatives may be needed — study the ghost', shape:{type:'ellipse',color:'#FF77AA',rotation:0,params:{x:13,y:13,w:6,h:3}}, target:{dx:-9,dy:-9,rotation:75} },
  { group:'X + Y + Rotation', hint:'The final challenge — use everything you know', shape:{type:'polygon',color:'#FF77AA',rotation:0,params:{p1x:2,p1y:2,p2x:8,p2y:2,p3x:5,p3y:8}}, target:{dx:8,dy:8,rotation:135} },
];

const CMD_META = { x:{label:'translateX()',step:1}, y:{label:'translateY()',step:1}, rotation:{label:'rotate()',step:15} };
const C = {
  x:        {text:'text-blue-400',   border:'border-blue-500/40',   hov:'hover:bg-blue-600',   active:'bg-blue-600',   dim:'bg-blue-900/30'},
  y:        {text:'text-purple-400', border:'border-purple-500/40', hov:'hover:bg-purple-600', active:'bg-purple-600', dim:'bg-purple-900/30'},
  rotation: {text:'text-emerald-400',border:'border-emerald-500/40',hov:'hover:bg-emerald-600',active:'bg-emerald-600',dim:'bg-emerald-900/30'},
};
const GROUPS = ['Translate X','Translate Y','X and Y','Rotation','X + Rotation','Y + Rotation','X + Y + Rotation'];

function calcPoints(t) { if(t<=1)return 10; if(t===2)return 7; if(t===3)return 5; if(t===4)return 3; return 1; }

// ── MEDAL ──────────────────────────────────────────────────────────
function Medal({ rank }) {
  if (rank===1) return <span className="text-xl">🥇</span>;
  if (rank===2) return <span className="text-xl">🥈</span>;
  if (rank===3) return <span className="text-xl">🥉</span>;
  return <span className="text-sm font-black text-slate-500">#{rank}</span>;
}

// ── LEADERBOARD MODAL ──────────────────────────────────────────────
function LeaderboardModal({ onClose, highlightName }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('shape_match_leaderboard').select('*')
      .then(({ data }) => { setRows(data||[]); setLoading(false); });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{opacity:0,scale:0.92,y:16}} animate={{opacity:1,scale:1,y:0}}
        exit={{opacity:0,scale:0.92,y:16}}
        transition={{type:'spring',stiffness:280,damping:22}}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-black text-yellow-400 uppercase tracking-widest">🏆 Leaderboard</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Top 20 Shape Match scores</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg font-bold transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading && <div className="text-center py-10 text-slate-500 text-sm">Loading…</div>}
          {!loading && rows.length===0 && (
            <div className="text-center py-10 text-slate-600 text-sm italic">No scores yet — be the first!</div>
          )}
          {rows.map((row, i) => {
            const isMe = highlightName && row.player_name.toLowerCase()===highlightName.toLowerCase();
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${isMe ? 'bg-yellow-500/15 border border-yellow-500/40' : 'bg-slate-800/50 border border-slate-700/40'}`}>
                <div className="w-8 flex items-center justify-center shrink-0">
                  <Medal rank={Number(row.rank)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-black text-sm truncate ${isMe?'text-yellow-300':'text-white'}`}>
                    {row.player_name} {isMe && <span className="text-yellow-500 text-[10px]">← you</span>}
                  </p>
                  <p className="text-[10px] text-slate-500">{row.levels_completed}/21 levels</p>
                </div>
                <div className={`font-black text-lg shrink-0 ${isMe?'text-yellow-400':'text-slate-300'}`}>
                  {row.score}<span className="text-[10px] text-slate-600 ml-1">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ── SCORE SUBMIT MODAL ─────────────────────────────────────────────
function ScoreSubmitModal({ score, levelsCompleted, onDone }) {
  const [name, setName]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [showBoard, setShowBoard] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true); setError('');
    const { error } = await supabase.from('shape_match_scores').insert({
      player_name: name.trim(), score, levels_completed: levelsCompleted,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setShowBoard(true);
  }

  if (showBoard) return (
    <AnimatePresence>
      <LeaderboardModal onClose={onDone} highlightName={name.trim()} />
    </AnimatePresence>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{opacity:0,scale:0.88,y:20}} animate={{opacity:1,scale:1,y:0}}
        transition={{type:'spring',stiffness:260,damping:20}}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xs shadow-2xl p-6 text-center"
      >
        <motion.div animate={{rotate:[0,10,-10,0]}} transition={{duration:0.6,repeat:2,delay:0.3}} className="text-6xl mb-2">🏆</motion.div>
        <h2 className="text-2xl font-black text-emerald-400 italic uppercase mb-1">Complete!</h2>
        <p className="text-slate-400 text-sm mb-1">All {levelsCompleted} shapes matched!</p>
        <div className="text-4xl font-black text-yellow-400 mb-5">⭐ {score} pts</div>

        <p className="text-[11px] text-slate-400 uppercase font-bold tracking-widest mb-2">Enter your name for the leaderboard</p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key==='Enter' && handleSubmit()}
          placeholder="Your name…"
          autoFocus
          maxLength={24}
          className="w-full bg-slate-800 border border-slate-700 focus:border-yellow-500/60 rounded-xl px-3 py-2.5 text-sm text-white outline-none text-center font-bold placeholder:text-slate-600 mb-3"
        />
        {error && <p className="text-red-400 text-xs mb-3">⚠ {error}</p>}

        <button onClick={handleSubmit} disabled={saving||!name.trim()}
          className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-black text-sm uppercase py-3 rounded-xl transition-all mb-2">
          {saving ? '⏳ Saving…' : '🏆 Submit & See Leaderboard'}
        </button>
        <button onClick={onDone} className="w-full text-slate-600 hover:text-slate-400 text-xs font-bold uppercase py-1.5 transition-colors">
          Skip
        </button>
      </motion.div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────
export default function ShapeMatchGame() {
  const [screen,     setScreen]     = useState('menu');
  const [levelIdx,   setLevelIdx]   = useState(0);
  const [commands,   setCommands]   = useState([]);
  const [displayDx,  setDisplayDx]  = useState(0);
  const [displayDy,  setDisplayDy]  = useState(0);
  const [displayRot, setDisplayRot] = useState(0);
  const [isRunning,  setIsRunning]  = useState(false);
  const [attempted,  setAttempted]  = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [tries,      setTries]      = useState(0);
  const [totalPts,   setTotalPts]   = useState(0);
  const [modal,      setModal]      = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // score submit state
  const [scorePhase, setScorePhase] = useState('idle'); // 'idle' | 'submitting'
  const [finalScore, setFinalScore] = useState(0);

  const lvl      = LEVELS[levelIdx];
  const groupIdx = Math.floor(levelIdx / 3);
  const inGroup  = levelIdx % 3;

  function resetDisplay() { setDisplayDx(0); setDisplayDy(0); setDisplayRot(0); }

  function startGame() {
    setLevelIdx(0); setCommands([]); resetDisplay();
    setAttempted(false); setSuccess(false);
    setTries(0); setTotalPts(0); setModal(null);
    setShowLeaderboard(false); setScorePhase('idle');
    setScreen('game');
  }

  function toggleCommand(type) {
    if (isRunning) return;
    setAttempted(false);
    setCommands(prev => {
      const has = prev.find(c=>c.type===type);
      if (has) return prev.filter(c=>c.type!==type);
      return [...prev, {type, value:0}];
    });
  }

  function removeCommand(type) { if(isRunning)return; setAttempted(false); setCommands(p=>p.filter(c=>c.type!==type)); }
  function setVal(type, v)     { if(isRunning)return; setAttempted(false); const n=parseFloat(v); setCommands(p=>p.map(c=>c.type===type?{...c,value:isNaN(n)?0:n}:c)); }
  function resetLevel()        { if(isRunning)return; setCommands([]); resetDisplay(); setAttempted(false); setSuccess(false); setTries(0); }

  // ── RUN ──────────────────────────────────────────────────────────
  async function handleRun() {
    if (isRunning||commands.length===0) return;
    setIsRunning(true); setAttempted(false); setSuccess(false);
    setDisplayDx(0); setDisplayDy(0); setDisplayRot(0);
    await delay(120);

    let aDx=0, aDy=0, aRot=0;
    for (const cmd of commands) {
      if (cmd.type==='x')        { const n=aDx+cmd.value; await springTo(aDx,n,setDisplayDx); aDx=n; }
      else if (cmd.type==='y')   { const n=aDy+cmd.value; await springTo(aDy,n,setDisplayDy); aDy=n; }
      else if (cmd.type==='rotation') { const n=aRot+cmd.value; await springTo(aRot,n,setDisplayRot); aRot=n; }
      await delay(320);
    }

    const {target} = lvl;
    const dxOk  = Math.abs(aDx-target.dx) < 0.7;
    const dyOk  = Math.abs(aDy-target.dy) < 0.7;
    const normR = ((aRot-target.rotation)%360+360)%360;
    const rotOk = normR<15||normR>345;
    const matched = dxOk&&dyOk&&rotOk;

    const thisTry=tries+1; setTries(thisTry); setAttempted(true);

    if (matched) {
      const pts=calcPoints(thisTry);
      const newTotal=totalPts+pts;
      setTotalPts(newTotal);
      setSuccess(true); setModal({pts});
      await delay(2000); setModal(null);
      const next=levelIdx+1;
      if (next>=LEVELS.length) {
        setFinalScore(newTotal);
        setScorePhase('submitting');
        setScreen('done');
      } else {
        setLevelIdx(next); setCommands([]); resetDisplay();
        setAttempted(false); setSuccess(false); setTries(0);
      }
    } else {
      await delay(400);
      await Promise.all([
        aDx!==0  ? springTo(aDx,0,setDisplayDx)  : Promise.resolve(),
        aDy!==0  ? springTo(aDy,0,setDisplayDy)  : Promise.resolve(),
        aRot!==0 ? springTo(aRot,0,setDisplayRot): Promise.resolve(),
      ]);
    }
    setIsRunning(false);
  }

  const ghostShape  = applyOffset(lvl.shape, lvl.target.dx, lvl.target.dy, lvl.target.rotation);
  const playerShape = applyOffset(lvl.shape, displayDx, displayDy, displayRot);

  // ── MENU ─────────────────────────────────────────────────────────
  if (screen==='menu') return (
    <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center font-mono">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="text-center max-w-xs w-full px-6">
        <h1 className="text-5xl font-black text-orange-500 italic uppercase mb-3">Shape Match</h1>
        <p className="text-slate-400 text-sm mb-2 leading-relaxed">Move the shape onto the ghost using</p>
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          <span className="text-blue-400 font-black text-xs">translateX()</span>
          <span className="text-slate-600">·</span>
          <span className="text-purple-400 font-black text-xs">translateY()</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400 font-black text-xs">rotate()</span>
        </div>

        <button onClick={startGame}
          className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-xl font-black text-xl uppercase transition-all active:translate-y-1 shadow-lg mb-3">
          Start Game →
        </button>
        <button onClick={()=>setShowLeaderboard(true)}
          className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 py-3 rounded-xl font-black text-sm uppercase text-yellow-400 transition-all">
          🏆 Leaderboard
        </button>
      </motion.div>

      <AnimatePresence>
        {showLeaderboard && <LeaderboardModal onClose={()=>setShowLeaderboard(false)} />}
      </AnimatePresence>
    </div>
  );

  // ── DONE ─────────────────────────────────────────────────────────
  if (screen==='done') return (
    <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center font-mono">
      <AnimatePresence>
        {scorePhase==='submitting' ? (
          <ScoreSubmitModal
            score={finalScore}
            levelsCompleted={LEVELS.length}
            onDone={()=>{ setScorePhase('idle'); setScreen('menu'); }}
          />
        ) : (
          /* fallback if they already submitted */
          <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="text-center px-6 max-w-sm">
            <div className="text-8xl mb-4">🏆</div>
            <h1 className="text-5xl font-black text-emerald-400 italic uppercase mb-3">Complete!</h1>
            <div className="text-4xl font-black text-yellow-400 mb-8">⭐ {finalScore} pts</div>
            <button onClick={startGame} className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-xl font-black text-xl uppercase transition-all mb-3">Play Again</button>
            <motion.a href="/coding/flipnfit" className="block w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 rounded-xl font-black text-sm uppercase text-slate-200 transition-all text-center">
              Play Flip & Fit →
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ── GAME ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col md:flex-row font-mono overflow-hidden">

      {/* LEFT: GRID */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 relative select-none">
        <div className="relative w-full aspect-square max-w-[550px] border-2 border-slate-800 bg-[#01040a]">
          {Array.from({length:5}).map((_,i)=>(
            <span key={`xl-${i}`} className="absolute text-[10px] text-slate-600" style={{left:`${(i*5/GRID)*100}%`,top:'-20px'}}>{i*5}</span>
          ))}
          {Array.from({length:5}).map((_,i)=>(
            <span key={`yl-${i}`} className="absolute text-[10px] text-slate-600" style={{left:'-20px',top:`${(i*5/GRID)*100}%`}}>{i*5}</span>
          ))}
          <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible">
            {Array.from({length:GRID+1}).map((_,i)=><line key={`gv${i}`} x1={i} y1="0" x2={i} y2={GRID} stroke="#1a202c" strokeWidth="0.05"/>)}
            {Array.from({length:GRID+1}).map((_,i)=><line key={`gh${i}`} x1="0" y1={i} x2={GRID} y2={i} stroke="#1a202c" strokeWidth="0.05"/>)}
            <ShapeRenderer s={ghostShape} isOutline={true}/>
            <ShapeRenderer s={playerShape} isSuccess={success}/>
            {success && <motion.rect x="0" y="0" width={GRID} height={GRID} fill="#4ADE80" initial={{opacity:0.18}} animate={{opacity:0}} transition={{duration:1.2}}/>}
          </svg>
          <AnimatePresence>
            {modal && (
              <motion.div initial={{opacity:0,scale:0.7,y:10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.8,y:-10}} transition={{type:'spring',stiffness:300,damping:18}} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-slate-900/95 border-2 border-emerald-500/60 rounded-2xl px-10 py-8 text-center shadow-2xl">
                  <div className="text-5xl mb-2">{modal.pts===10?'🏆':modal.pts>=7?'🎉':modal.pts>=5?'👍':'✓'}</div>
                  <div className="text-emerald-400 font-black text-lg uppercase tracking-widest mb-1">Matched!</div>
                  <div className="text-6xl font-black text-yellow-400 my-2">+{modal.pts}</div>
                  <div className="text-slate-500 text-xs uppercase tracking-widest">{tries===1?'First try!':tries===2?'2nd attempt':tries===3?'3rd attempt':`${tries} attempts`}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT: CONTROLS */}
      <div className="w-full md:w-[400px] bg-slate-900 border-l border-white/10 p-5 flex flex-col overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-black text-orange-500 italic uppercase">Shape Match</h1>
          <div className="flex items-center gap-2">
            <button onClick={()=>setShowLeaderboard(true)}
              className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 px-2.5 py-1 rounded-lg text-yellow-400 font-black text-xs uppercase transition-all">
              🏆
            </button>
            <div className="bg-yellow-500/20 border border-yellow-500/40 px-3 py-1 rounded-lg">
              <span className="text-yellow-400 font-black text-sm">⭐ {totalPts}</span>
            </div>
            <button onClick={()=>setScreen('menu')} className="text-xs text-slate-500 hover:text-white uppercase font-bold">← Menu</button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex gap-1 mb-1.5">
            {GROUPS.map((_,i)=>(
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i<groupIdx?'bg-emerald-500':i===groupIdx?'bg-orange-400':'bg-slate-700'}`}/>
            ))}
          </div>
          <div className="flex gap-1.5 px-0.5">
            {[0,1,2].map(i=>(
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i<inGroup?'bg-emerald-500':i===inGroup?'bg-orange-400':'bg-slate-700'}`}/>
            ))}
            <span className="text-[9px] text-slate-600 ml-1 self-center">level {levelIdx+1}/21</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={levelIdx} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="flex-1 flex flex-col min-h-0">
            <div className="bg-black/40 p-3 rounded-xl border border-orange-500/20 mb-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{lvl.group}</span>
                <div className="flex gap-1">
                  {lvl.target.dx!==0     && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 font-bold">X</span>}
                  {lvl.target.dy!==0     && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-400 font-bold">Y</span>}
                  {lvl.target.rotation!==0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-400 font-bold">ROT</span>}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic mt-1">{lvl.hint}</p>
            </div>

            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2 flex-shrink-0">Add Commands</p>
            <div className="grid grid-cols-3 gap-1.5 mb-4 flex-shrink-0">
              {['x','y','rotation'].map(type=>{
                const meta=CMD_META[type]; const col=C[type];
                const on=!!commands.find(c=>c.type===type);
                return (
                  <button key={type} onClick={()=>toggleCommand(type)} disabled={isRunning}
                    className={`py-2.5 rounded-lg font-black text-[10px] uppercase transition-all border disabled:opacity-30 ${on?`${col.active} text-white border-transparent shadow-lg`:`bg-slate-800 ${col.text} ${col.border} hover:bg-slate-700`}`}>
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 mb-3">
              {commands.length===0 ? (
                <div className="text-center py-8 text-slate-700 italic text-xs border border-dashed border-slate-800 rounded-xl">Add commands above, then hit Run ▶</div>
              ) : (
                <AnimatePresence>
                  {commands.map(cmd=>{
                    const meta=CMD_META[cmd.type]; const col=C[cmd.type];
                    return (
                      <motion.div key={cmd.type} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10}} className={`p-3 rounded-xl border ${col.border} ${col.dim}`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className={`text-[9px] font-black uppercase tracking-widest ${col.text}`}>
                            {meta.label}
                            {cmd.type==='rotation' && <span className="text-slate-600 ml-1 normal-case font-normal">(±15° steps)</span>}
                          </label>
                          <button onClick={()=>removeCommand(cmd.type)} disabled={isRunning}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/15 transition-all disabled:opacity-30 text-[14px] font-black leading-none">×</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={()=>setVal(cmd.type,cmd.value-meta.step)} disabled={isRunning}
                            className={`bg-slate-700 ${col.hov} text-white font-black w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0 disabled:opacity-30 text-lg`}>−</button>
                          <input type="number" value={cmd.value} onChange={e=>setVal(cmd.type,e.target.value)} disabled={isRunning}
                            className={`flex-1 bg-slate-900 font-black text-base outline-none ${col.text} text-center rounded-lg py-2 border ${col.border} disabled:opacity-40`}/>
                          <button onClick={()=>setVal(cmd.type,cmd.value+meta.step)} disabled={isRunning}
                            className={`bg-slate-700 ${col.hov} text-white font-black w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0 disabled:opacity-30 text-lg`}>+</button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            <AnimatePresence>
              {attempted && !success && !isRunning && (
                <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center flex-shrink-0">
                  <p className="text-red-400 font-black text-sm">Not quite! Adjust and try again</p>
                  <p className="text-slate-600 text-[10px] mt-1">attempt {tries} · next correct = {calcPoints(tries+1)} pts</p>
                </motion.div>
              )}
              {success && (
                <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="mb-3 bg-emerald-500/10 border border-emerald-500/50 rounded-xl p-3 text-center flex-shrink-0">
                  <p className="text-emerald-400 font-black text-lg">✓ Matched!</p>
                  <p className="text-slate-500 text-xs mt-0.5">{levelIdx+1<LEVELS.length?'Next level...':'All done!'}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 flex-shrink-0">
              <motion.button onClick={handleRun} disabled={isRunning||commands.length===0} whileTap={{scale:0.97}}
                className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-base uppercase transition-all shadow-lg">
                {isRunning?'⏳ Running...':'▶  Run'}
              </motion.button>
              <button onClick={resetLevel} disabled={isRunning}
                className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl font-bold text-slate-300 transition-all text-lg">↺</button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Leaderboard modal from in-game trophy button */}
        <AnimatePresence>
          {showLeaderboard && <LeaderboardModal onClose={()=>setShowLeaderboard(false)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}