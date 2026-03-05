'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence, animate as fmAnimate } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GRID = 20;

// ── SHARED GAME ENGINE (same as ObstacleCourse) ────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms));

function springTo(from, to, setter) {
  return new Promise(resolve => {
    fmAnimate(from, to, {
      type: 'spring', stiffness: 180, damping: 15, mass: 1.2, velocity: 0.5,
      onUpdate: v => setter(v), onComplete: resolve,
    });
  });
}

function getRectCorners(x, y, w, h, deg) {
  const cx = x + w / 2, cy = y + h / 2;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return [[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([lx,ly]) => ({
    x: cx + lx*cos - ly*sin, y: cy + lx*sin + ly*cos,
  }));
}

function checkCollision(px, py, rotation, obstacles) {
  const w = 4, h = 2, margin = 0.1;
  const cx = px + w/2, cy = py + h/2;
  const rad = (-rotation * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return obstacles.some(o => {
    const corners = [{x:o.x,y:o.y},{x:o.x+o.w,y:o.y},{x:o.x,y:o.y+o.h},{x:o.x+o.w,y:o.y+o.h}];
    for (let p of corners) {
      const dx=p.x-cx, dy=p.y-cy;
      const lX=dx*cos-dy*sin, lY=dx*sin+dy*cos;
      if (lX>=-(w/2-margin)&&lX<=(w/2-margin)&&lY>=-(h/2-margin)&&lY<=(h/2-margin)) return true;
    }
    for (let pc of getRectCorners(px,py,w,h,rotation))
      if (pc.x>=o.x&&pc.x<=o.x+o.w&&pc.y>=o.y&&pc.y<=o.y+o.h) return true;
    return false;
  });
}

const CMD_TYPES = ['x','y','rotation'];
const CMD_META  = { x:{label:'translateX()',step:1}, y:{label:'translateY()',step:1}, rotation:{label:'rotate()',step:15} };
const C = {
  x:        {text:'text-blue-400',   border:'border-blue-500/40',   hov:'hover:bg-blue-600',   dim:'bg-blue-900/30'},
  y:        {text:'text-purple-400', border:'border-purple-500/40', hov:'hover:bg-purple-600', dim:'bg-purple-900/30'},
  rotation: {text:'text-emerald-400',border:'border-emerald-500/40',hov:'hover:bg-emerald-600',dim:'bg-emerald-900/30'},
};

// ── NUM FIELD ──────────────────────────────────────────────────────
function NumField({ label, value, onChange, color='orange', step=1, min, max, disabled }) {
  const colors = {
    orange:  {text:'text-orange-400', border:'border-orange-500/40', btn:'hover:bg-orange-600/30'},
    emerald: {text:'text-emerald-400',border:'border-emerald-500/40',btn:'hover:bg-emerald-600/30'},
    slate:   {text:'text-slate-300',  border:'border-slate-600',     btn:'hover:bg-slate-600'},
  };
  const c = colors[color];
  const dec = () => { if(disabled)return; onChange(typeof min!=='undefined'?Math.max(min,value-step):value-step); };
  const inc = () => { if(disabled)return; onChange(typeof max!=='undefined'?Math.min(max,value+step):value+step); };
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest text-center">{label}</label>
      <div className={`flex items-center bg-slate-900 border ${c.border} rounded-lg overflow-hidden ${disabled?'opacity-40':''}`}>
        <button onClick={dec} className={`px-2 py-1.5 text-slate-400 font-black text-sm transition-colors ${c.btn} shrink-0`}>−</button>
        <input type="number" value={value} step={step}
          onChange={e => { if(!disabled) onChange(parseFloat(e.target.value)||0); }}
          className={`flex-1 bg-transparent text-center text-xs font-black outline-none ${c.text} w-0 min-w-0`}
        />
        <button onClick={inc} className={`px-2 py-1.5 text-slate-400 font-black text-sm transition-colors ${c.btn} shrink-0`}>+</button>
      </div>
    </div>
  );
}

// ── SAVE MODAL ────────────────────────────────────────────────────
function SaveModal({ onSave, onClose, saving, error }) {
  const [levelName, setLevelName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-black text-orange-500 italic uppercase mb-1">Save Level</h2>
        <p className="text-slate-500 text-xs mb-5">Your level will be saved to the shared database.</p>
        <div className="space-y-4 mb-5">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block mb-1.5">Level Name</label>
            <input type="text" value={levelName} onChange={e=>setLevelName(e.target.value)} placeholder="e.g. The Squeeze" autoFocus
              className="w-full bg-slate-800 border border-slate-700 focus:border-orange-500/60 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 font-bold"/>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block mb-1.5">Your Name</label>
            <input type="text" value={creatorName} onChange={e=>setCreatorName(e.target.value)} placeholder="e.g. Alex"
              className="w-full bg-slate-800 border border-slate-700 focus:border-orange-500/60 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 font-bold"/>
          </div>
        </div>
        {error && <p className="text-red-400 text-xs font-bold mb-3 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">⚠ {error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-sm rounded-xl transition-all disabled:opacity-40 uppercase">Cancel</button>
          <button onClick={()=>onSave({levelName:levelName.trim(),creatorName:creatorName.trim()})}
            disabled={saving||!levelName.trim()||!creatorName.trim()}
            className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl transition-all uppercase">
            {saving?'⏳ Saving...':'Save →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────
const EMPTY_OBS = () => ({ id: crypto.randomUUID(), x: 5, y: 5, w: 3, h: 1 });

export default function LevelMaker() {
  // ── design state
  const [start,     setStart]     = useState({ x: 1, y: 9, rotation: 0 });
  const [target,    setTarget]    = useState({ x: 15, y: 9, rotation: 0 });
  const [obstacles, setObstacles] = useState([]);
  const [hint,      setHint]      = useState('');
  const [hovObs,    setHovObs]    = useState(null);

  // ── panel: 'design' | 'test'
  const [panel, setPanel] = useState('design');

  // ── test state
  const [commands,  setCommands]  = useState([]);
  const [dispX,     setDispX]     = useState(0);
  const [dispY,     setDispY]     = useState(0);
  const [dispRot,   setDispRot]   = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [collision, setCollision] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [tries,     setTries]     = useState(0);
  // has the creator ever solved their own level?
  const [verified,  setVerified]  = useState(false);

  // ── save state
  const [showModal, setShowModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedOk,   setSavedOk]   = useState(false);

  const cmdListRef = useRef(null);

  const setS = (k,v) => { setStart(p=>({...p,[k]:v})); setVerified(false); };
  const setT = (k,v) => { setTarget(p=>({...p,[k]:v})); setVerified(false); };
  const setO = (id,k,v) => { setObstacles(p=>p.map(o=>o.id===id?{...o,[k]:v}:o)); setVerified(false); };
  const addObs  = () => { setObstacles(p=>[...p,EMPTY_OBS()]); setVerified(false); };
  const removeObs = id => { setObstacles(p=>p.filter(o=>o.id!==id)); setVerified(false); };

  const playerCx = start.x + 2, playerCy = start.y + 1;
  const targetCx = target.x + 2, targetCy = target.y + 1;

  // ── switch to test tab — commands persist, only reset animation state
  function enterTest() {
    setDispX(0); setDispY(0); setDispRot(0);
    setCollision(false); setAttempted(false); setTestSuccess(false);
    setPanel('test');
  }

  function exitTest() {
    setIsRunning(false);
    setDispX(0); setDispY(0); setDispRot(0);
    setCollision(false); setAttempted(false); setTestSuccess(false);
    setPanel('design');
  }

  // ── test command helpers
  function addCmd(type)    { if(isRunning)return; setAttempted(false); setCollision(false); setCommands(p=>[...p,{id:crypto.randomUUID(),type,value:0}]); }
  function removeCmd(id)   { if(isRunning)return; setCommands(p=>p.filter(c=>c.id!==id)); }
  function setVal(id,v)    { if(isRunning)return; setAttempted(false); setCollision(false); const n=parseFloat(v); setCommands(p=>p.map(c=>c.id===id?{...c,value:isNaN(n)?0:n}:c)); }
  function reorder(fi,ti)  {
    if(isRunning)return;
    const r=[...commands]; const [m]=r.splice(fi,1); r.splice(ti,0,m); setCommands(r);
  }
  function resetTest() {
    if(isRunning)return;
    setCommands([]); setDispX(0); setDispY(0); setDispRot(0);
    setCollision(false); setAttempted(false); setTestSuccess(false); setTries(0);
  }

  // ── RUN (same engine as ObstacleCourse)
  async function handleRun() {
    if (isRunning||commands.length===0) return;
    setIsRunning(true); setAttempted(false); setTestSuccess(false); setCollision(false);
    setDispX(0); setDispY(0); setDispRot(0);
    await delay(80);

    let cX=0, cY=0, cRot=0;

    for (const cmd of commands) {
      const total=cmd.value||0;
      if (total===0) { await delay(200); continue; }

      if (cmd.type==='x') {
        const ss=Math.max(8,Math.ceil(Math.abs(total)*4)), inc=total/ss;
        let safe=cX, hit=false;
        for(let i=1;i<=ss;i++){const t=cX+inc*i;if(checkCollision(start.x+t,start.y+cY,start.rotation+cRot,obstacles)){hit=true;break;}safe=t;}
        await springTo(cX,safe,setDispX); cX=safe;
        if(hit){setCollision(true);setAttempted(true);await delay(500);await Promise.all([springTo(cX,0,setDispX),springTo(cY,0,setDispY),springTo(cRot,0,setDispRot)]);setIsRunning(false);return;}
      } else if (cmd.type==='y') {
        const ss=Math.max(8,Math.ceil(Math.abs(total)*4)), inc=total/ss;
        let safe=cY, hit=false;
        for(let i=1;i<=ss;i++){const t=cY+inc*i;if(checkCollision(start.x+cX,start.y+t,start.rotation+cRot,obstacles)){hit=true;break;}safe=t;}
        await springTo(cY,safe,setDispY); cY=safe;
        if(hit){setCollision(true);setAttempted(true);await delay(500);await Promise.all([springTo(cX,0,setDispX),springTo(cY,0,setDispY),springTo(cRot,0,setDispRot)]);setIsRunning(false);return;}
      } else if (cmd.type==='rotation') {
        const ss=Math.max(8,Math.ceil(Math.abs(total)/5)), inc=total/ss;
        let safe=cRot, hit=false;
        for(let i=1;i<=ss;i++){const t=cRot+inc*i;if(checkCollision(start.x+cX,start.y+cY,start.rotation+t,obstacles)){hit=true;break;}safe=t;}
        await springTo(cRot,safe,setDispRot); cRot=safe;
        if(hit){setCollision(true);setAttempted(true);await delay(500);await Promise.all([springTo(cX,0,setDispX),springTo(cY,0,setDispY),springTo(cRot,0,setDispRot)]);setIsRunning(false);return;}
      }
      await delay(380);
    }

    // win check
    const pC=getRectCorners(start.x+cX,start.y+cY,4,2,start.rotation+cRot);
    const tC=getRectCorners(target.x,target.y,4,2,target.rotation);
    let mc=0; const used=new Set();
    for(let i=0;i<4;i++){const pc=pC[i];for(let j=0;j<4;j++){if(used.has(j))continue;const tc=tC[j];if(Math.abs(pc.x-tc.x)<0.35&&Math.abs(pc.y-tc.y)<0.35){mc++;used.add(j);break;}}}
    const isWin=mc===4;
    const thisTry=tries+1; setTries(thisTry); setAttempted(true);

    if (isWin) {
      setTestSuccess(true); setVerified(true);
      setDispX(target.x-start.x); setDispY(target.y-start.y); setDispRot(target.rotation-start.rotation);
    } else {
      await delay(500);
      await Promise.all([cX!==0?springTo(cX,0,setDispX):Promise.resolve(),cY!==0?springTo(cY,0,setDispY):Promise.resolve(),cRot!==0?springTo(cRot,0,setDispRot):Promise.resolve()]);
    }
    setIsRunning(false);
  }

  // ── SAVE
  async function handleSave({ levelName, creatorName }) {
    setSaving(true); setSaveError('');
    const { error } = await supabase.from('flip_and_fit_levels').insert({
      level_name: levelName, creator_name: creatorName,
      start_x: start.x, start_y: start.y, start_rotation: start.rotation,
      target_x: target.x, target_y: target.y, target_rotation: target.rotation,
      obstacles: obstacles.map(({x,y,w,h})=>({x,y,w,h})),
      hint: hint.trim()||null,
    });
    setSaving(false);
    if (error) { setSaveError(error.message); }
    else { setShowModal(false); setSavedOk(true); setTimeout(()=>setSavedOk(false),3000); }
  }

  // ── DERIVED (for grid display)
  const playerX   = start.x + dispX;
  const playerY   = start.y + dispY;
  const playerRot = start.rotation + dispRot;
  const pCx = playerX+2, pCy = playerY+1;
  const tCx = target.x+2, tCy = target.y+1;

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col font-mono overflow-hidden">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <a href="/coding/flipnfit" className="text-orange-500 font-black text-lg italic uppercase hover:text-orange-400 transition-colors">Flip &amp; Fit!</a>
          <span className="text-slate-600 text-xs">›</span>
          <span className="text-slate-300 font-bold text-sm uppercase tracking-widest">Level Maker</span>
        </div>
        <div className="flex items-center gap-3">
          {savedOk && <span className="text-emerald-400 text-xs font-black uppercase animate-pulse">✓ Level Saved!</span>}

          {/* verified badge */}
          {verified && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-black uppercase bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
              ✓ Solvable
            </span>
          )}

          {/* test button */}
          {panel === 'design' ? (
            <button onClick={enterTest}
              className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-black text-sm uppercase px-4 py-2 rounded-xl transition-all">
              ▶ Test Level
            </button>
          ) : (
            <button onClick={exitTest}
              className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-black text-sm uppercase px-4 py-2 rounded-xl transition-all">
              ← Edit
            </button>
          )}

          <button
            onClick={() => { setShowModal(true); setSaveError(''); }}
            disabled={!verified}
            title={verified ? 'Save level' : 'Solve your level first to unlock saving'}
            className="relative bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-sm uppercase px-4 py-2 rounded-xl transition-all shadow-lg">
            {verified ? 'Save Level →' : '🔒 Save Level'}
          </button>
        </div>
      </div>

      {!verified && panel === 'design' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-2 text-amber-400 text-xs font-bold flex items-center gap-2 shrink-0">
          <span>⚠</span>
          <span>You must <button onClick={enterTest} className="underline hover:text-amber-300">test and solve your level</button> before you can save it — this ensures it's actually possible!</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: GRID ── */}
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 relative select-none">
          <div className="relative w-full aspect-square max-w-[560px] border-2 border-slate-400 bg-[#01040a]">
            {Array.from({length:5}).map((_,i)=>(
              <span key={`xl-${i}`} className="absolute text-[10px] text-slate-200" style={{left:`${(i*5/GRID)*100}%`,top:'-18px'}}>{i*5}</span>
            ))}
            {Array.from({length:5}).map((_,i)=>(
              <span key={`yl-${i}`} className="absolute text-[10px] text-slate-200" style={{left:'-18px',top:`${(i*5/GRID)*100}%`}}>{i*5}</span>
            ))}
            <svg viewBox={`0 0 ${GRID} ${GRID}`} className="w-full h-full overflow-visible">
              {Array.from({length:GRID+1}).map((_,i)=><line key={`v${i}`} x1={i} y1="0" x2={i} y2={GRID} stroke="#1a202c" strokeWidth="0.05"/>)}
              {Array.from({length:GRID+1}).map((_,i)=><line key={`h${i}`} x1="0" y1={i} x2={GRID} y2={i} stroke="#1a202c" strokeWidth="0.05"/>)}

              {/* obstacles */}
              {obstacles.map((o,i)=>(
                <g key={o.id}>
                  <rect x={o.x} y={o.y} width={o.w} height={o.h}
                    fill={hovObs===o.id?'#4b5563':'#334155'}
                    stroke={hovObs===o.id?'#94a3b8':'#475569'} strokeWidth="0.1"/>
                  <text x={o.x+o.w/2} y={o.y+o.h/2+0.35} textAnchor="middle" fontSize="0.7" fill="#94a3b8" fontFamily="monospace" fontWeight="bold">{i+1}</text>
                </g>
              ))}

              {/* target outline */}
              <rect x={target.x} y={target.y} width={4} height={2}
                fill="none" stroke="#4ADE80" strokeWidth="0.25" strokeDasharray="0.5,0.4" opacity={0.7}
                transform={`rotate(${target.rotation} ${tCx} ${tCy})`}/>
              <text x={tCx} y={tCy+0.35} textAnchor="middle" fontSize="0.6" fill="#4ADE80" fontFamily="monospace" fontWeight="bold" opacity="0.9"
                transform={`rotate(${target.rotation} ${tCx} ${tCy})`}>END</text>

              {/* player rect — in design mode shows static start; in test mode animates */}
              <rect x={playerX} y={playerY} width={4} height={2}
                fill={collision?'#EF4444':testSuccess?'#4ADE80':'#F97316'}
                stroke={collision?'#FCA5A5':testSuccess?'#fff':'none'} strokeWidth={0.2}
                transform={`rotate(${playerRot} ${pCx} ${pCy})`}
                style={{filter:collision?'drop-shadow(0 0 4px rgba(239,68,68,0.8))':testSuccess?'drop-shadow(0 0 6px rgba(74,222,128,0.7))':'drop-shadow(0 0 3px rgba(249,115,22,0.5))'}}
              />
              {panel==='design' && (
                <text x={pCx} y={pCy+0.35} textAnchor="middle" fontSize="0.6" fill="white" fontFamily="monospace" fontWeight="bold"
                  transform={`rotate(${start.rotation} ${pCx} ${pCy})`}>START</text>
              )}

              {testSuccess && <motion.rect x="0" y="0" width={GRID} height={GRID} fill="#4ADE80" initial={{opacity:0.15}} animate={{opacity:0}} transition={{duration:1.2}}/>}
              {collision   && <motion.rect x="0" y="0" width={GRID} height={GRID} fill="#EF4444" initial={{opacity:0.12}} animate={{opacity:0}} transition={{duration:0.6}}/>}
            </svg>
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 text-[10px] text-slate-600">
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-2 bg-orange-500 rounded-sm"/>start</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 border border-dashed border-emerald-400"/>target</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-2 bg-slate-500 rounded-sm"/>obstacle</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-[400px] bg-slate-900 border-l border-white/10 flex flex-col overflow-hidden">

          {/* ── TAB SWITCHER ── */}
          <div className="flex border-b border-slate-800 shrink-0">
            <button onClick={()=>setPanel('design')}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${panel==='design'?'text-orange-400 border-b-2 border-orange-400 bg-black/20':'text-slate-600 hover:text-slate-400'}`}>
              ✏ Design
            </button>
            <button onClick={enterTest}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${panel==='test'?'text-emerald-400 border-b-2 border-emerald-400 bg-black/20':'text-slate-600 hover:text-slate-400'}`}>
              ▶ Test {verified && '✓'}
            </button>
          </div>

          <AnimatePresence mode="wait">

            {/* ══ DESIGN PANEL ══ */}
            {panel==='design' && (
              <motion.div key="design" initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* START */}
                <div className="bg-orange-900/15 border border-orange-500/25 rounded-xl p-3">
                  <p className="text-[10px] text-orange-400 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-500 rounded-sm inline-block"/> Start Position
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <NumField label="X" value={start.x} onChange={v=>setS('x',v)} color="orange" min={0} max={16}/>
                    <NumField label="Y" value={start.y} onChange={v=>setS('y',v)} color="orange" min={0} max={18}/>
                    <NumField label="Rotation °" value={start.rotation} onChange={v=>setS('rotation',v)} color="orange" step={15}/>
                  </div>
                </div>

                {/* TARGET */}
                <div className="bg-emerald-900/15 border border-emerald-500/25 rounded-xl p-3">
                  <p className="text-[10px] text-emerald-400 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-3 h-0.5 border-2 border-dashed border-emerald-400 inline-block"/> Target Position
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <NumField label="X" value={target.x} onChange={v=>setT('x',v)} color="emerald" min={0} max={16}/>
                    <NumField label="Y" value={target.y} onChange={v=>setT('y',v)} color="emerald" min={0} max={18}/>
                    <NumField label="Rotation °" value={target.rotation} onChange={v=>setT('rotation',v)} color="emerald" step={15}/>
                  </div>
                </div>

                {/* OBSTACLES */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                      Obstacles <span className="text-slate-600 font-normal">({obstacles.length})</span>
                    </p>
                    <button onClick={addObs} className="text-[10px] font-black uppercase bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-all border border-slate-600">
                      + Add
                    </button>
                  </div>
                  {obstacles.length===0 && (
                    <div className="text-center py-5 text-slate-600 text-xs italic border border-dashed border-slate-800 rounded-xl">No obstacles yet — add some walls!</div>
                  )}
                  <div className="space-y-2">
                    {obstacles.map((o,i)=>(
                      <div key={o.id} onMouseEnter={()=>setHovObs(o.id)} onMouseLeave={()=>setHovObs(null)}
                        className="bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 rounded-xl p-3 transition-all">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[10px] text-slate-400 font-black uppercase">Obstacle {i+1}</span>
                          <button onClick={()=>removeObs(o.id)} className="text-slate-600 hover:text-red-400 transition-colors text-[10px] font-bold">✕ remove</button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          <NumField label="X" value={o.x} onChange={v=>setO(o.id,'x',v)} color="slate" min={0} max={19}/>
                          <NumField label="Y" value={o.y} onChange={v=>setO(o.id,'y',v)} color="slate" min={0} max={19}/>
                          <NumField label="W" value={o.w} onChange={v=>setO(o.id,'w',v)} color="slate" min={0.5} max={20} step={0.5}/>
                          <NumField label="H" value={o.h} onChange={v=>setO(o.id,'h',v)} color="slate" min={0.5} max={20} step={0.5}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HINT */}
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Hint (optional)</p>
                  <textarea value={hint} onChange={e=>setHint(e.target.value)} placeholder="e.g. Rotate first, then slide through the gap!" rows={2}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-slate-500 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none resize-none transition-colors placeholder:text-slate-700"/>
                </div>

                {/* CTA */}
                <button onClick={enterTest}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-black text-sm uppercase rounded-xl transition-all">
                  ▶ Test your level →
                </button>
              </motion.div>
            )}

            {/* ══ TEST PANEL ══ */}
            {panel==='test' && (
              <motion.div key="test" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10}} className="flex-1 flex flex-col overflow-hidden p-4">

                {testSuccess ? (
                  <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                    className="mb-3 bg-emerald-500/10 border-2 border-emerald-500/50 rounded-xl p-4 text-center flex-shrink-0">
                    <p className="text-3xl mb-1">🎉</p>
                    <p className="text-emerald-400 font-black text-base uppercase">Level is solvable!</p>
                    <p className="text-slate-500 text-xs mt-1">The Save button is now unlocked.</p>
                  </motion.div>
                ) : (
                  <div className="bg-black/40 p-3 rounded-xl border border-slate-700 mb-3 flex-shrink-0">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">Test Mode</p>
                    <p className="text-[11px] text-slate-500 italic">Solve your own level to prove it's possible. The Save button unlocks when you succeed.</p>
                  </div>
                )}

                {/* command add buttons */}
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-2 flex-shrink-0">Commands:</p>
                <div className="grid grid-cols-3 gap-1.5 mb-3 flex-shrink-0">
                  {CMD_TYPES.map(type=>{const meta=CMD_META[type];const col=C[type];return(
                    <button key={type} onClick={()=>addCmd(type)} disabled={isRunning}
                      className={`py-2.5 rounded-lg font-black text-[10px] uppercase transition-all border disabled:opacity-30 bg-slate-800 ${col.text} ${col.border} hover:bg-slate-700`}>
                      + {meta.label}
                    </button>
                  );})}
                </div>

                {/* command list */}
                <div ref={cmdListRef} className="flex-1 overflow-y-auto min-h-0 space-y-1.5 mb-3">
                  {commands.length===0 ? (
                    <div className="text-center py-8 text-slate-600 italic text-xs border border-dashed border-slate-800 rounded-xl">Add commands, then hit Run ▶</div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {commands.map((cmd,idx)=>{const meta=CMD_META[cmd.type];const col=C[cmd.type];return(
                        <motion.div key={cmd.id}
                          initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10}}
                          layout drag="y" dragSnapToOrigin={true}
                          onDragEnd={(_,info)=>{const H=48;const mv=Math.round(info.offset.y/H);const ni=Math.max(0,Math.min(commands.length-1,idx+mv));if(ni!==idx)reorder(idx,ni);}}
                          whileDrag={{scale:1.04,opacity:0.85,zIndex:50,boxShadow:'0 8px 30px rgba(0,0,0,0.5)'}}
                          className={`p-2.5 rounded-xl border ${col.border} ${col.dim} flex items-center gap-2 cursor-grab active:cursor-grabbing`}>
                          <div className="text-slate-600 text-[9px] font-black w-4 shrink-0 flex items-center justify-center">
                            <span className="text-xs mr-1 opacity-50">⋮⋮</span>{idx+1}
                          </div>
                          <span className={`text-[10px] font-black ${col.text} flex-1 truncate`}>{meta.label}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={()=>setVal(cmd.id,cmd.value-meta.step)} disabled={isRunning}
                              className={`bg-slate-700 ${col.hov} text-white font-black w-7 h-7 rounded flex items-center justify-center transition-all disabled:opacity-30 text-sm`}>−</button>
                            <input type="number" value={cmd.value} onChange={e=>setVal(cmd.id,e.target.value)} disabled={isRunning}
                              className={`w-12 bg-slate-900 font-black text-sm outline-none ${col.text} text-center rounded py-1 border ${col.border} disabled:opacity-40`}/>
                            <button onClick={()=>setVal(cmd.id,cmd.value+meta.step)} disabled={isRunning}
                              className={`bg-slate-700 ${col.hov} text-white font-black w-7 h-7 rounded flex items-center justify-center transition-all disabled:opacity-30 text-sm`}>+</button>
                          </div>
                          <button onClick={()=>removeCmd(cmd.id)} disabled={isRunning} className="text-slate-600 hover:text-red-400 disabled:opacity-30 text-xs px-1">✕</button>
                        </motion.div>
                      );})}
                    </AnimatePresence>
                  )}
                </div>

                {/* feedback */}
                <AnimatePresence>
                  {collision && !isRunning && (
                    <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                      className="mb-3 bg-red-500/10 border border-red-500/40 rounded-xl p-3 text-center flex-shrink-0">
                      <p className="text-red-400 font-black text-sm">💥 Hit a wall — fix the sequence</p>
                    </motion.div>
                  )}
                  {attempted && !collision && !testSuccess && !isRunning && (
                    <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                      className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center flex-shrink-0">
                      <p className="text-red-400 font-black text-sm">Didn't reach the target</p>
                      <p className="text-slate-600 text-[10px] mt-1">attempt {tries}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* run + reset */}
                <div className="flex gap-2 flex-shrink-0">
                  <motion.button onClick={handleRun} disabled={isRunning||commands.length===0} whileTap={{scale:0.97}}
                    className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-base uppercase transition-all shadow-lg">
                    {isRunning?'⏳ Running...':'▶  Run'}
                  </motion.button>
                  <button onClick={resetTest} disabled={isRunning}
                    className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl font-bold text-slate-300 transition-all text-lg">↺</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showModal && (
        <SaveModal onSave={handleSave} onClose={()=>setShowModal(false)} saving={saving} error={saveError}/>
      )}
    </div>
  );
}