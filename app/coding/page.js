'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image'; 
const GAMES = [
  {
    href: '/coding/code-draw',
    title: 'Coordinates Detective',
    emoji: '🎯',
    tagline: 'Read the code, find the shape!',
    desc: 'Circles, rectangles, lines — learn to read coordinates by clicking the right shape on the grid.',
    color: '#f43f5e',
    bg: '#1a0608',
    stars: 1,
    tag: 'COORDINATES',
  },
  {
    href: '/coding/drawing',
    title: 'Shape Lab',
    emoji: '🎨',
    tagline: 'Draw with code!',
    desc: 'Build houses, fish and flowers with shapes. Create anything you can imagine with geometry!',
    color: '#facc15',
    bg: '#1a1600',
    stars: 2,
    tag: 'CREATIVE',
  },
  {
    href: '/coding/maze-navigator',
    title: 'Maze Navigator',
    emoji: '🤖',
    tagline: 'Program your robot!',
    desc: 'Guide your robot through a maze by writing translateX and translateY commands. Dont hit the walls!',
    color: '#a78bfa',
    bg: '#0f0a1a',
    stars: 2,
    tag: 'TRANSLATE',
  },
  {
    href: '/coding/shape-match',
    title: 'Shape Match',
    emoji: '🔷',
    tagline: '21 levels of transforms',
    desc: 'Move shapes to match their target position using translate and rotate. Do not guess, fewer attempts = more points!',
    color: '#fb923c',
    bg: '#1a0e05',
    stars: 3,
    tag: 'TRANSLATE AND ROTATE',
  },
  {
    href: '/coding/flipnfit',
    title: 'Flip & Fit',
    emoji: '🧱',
    tagline: 'Ultimate Challenge, good luck...',
    desc: 'Ultimate Challenge, good luck...',
    color: '#34d399',
    bg: '#001a0e',
    stars: 4,
    tag: 'SEQUENCE',
  },
  {
    href: '/coding/froggy',
    title: 'Frogger Studio',
    emoji: '🐸',
    tagline: 'Design and play your own Frogger level!',
    desc: 'Build your own Frogger level — set roads, rivers and logs, then jump in and play it yourself. Save your levels and challenge others!',
    color: '#2ecc71',
    bg: '#001a0a',
    stars: 3,
    tag: 'LEVEL DESIGN',
  },
    {
    href: 'https://trinket.io/pygame/64720f309f55',
    title: 'FIX THE ROBOT',
    emoji: '',
    tagline: 'fix the robot code !',
    desc: 'change the parameters ( x , y , h , w, radius, color) to make the robot look like the target image.',
    bg: '#001a0a',
    stars: 3,
    tag: 'BUG FIXING',
  },
      {
    href: 'https://trinket.io/pygame/695c72260ad3',
    title: 'MAKE IT MOVE',
    emoji: '',
    tagline: 'make the circle move !',
    desc: 'Find a way to make the circle move and stop him from going off the screen.',
    bg: '#52f18ffe',
    stars: 3,
    tag: 'BUG FIXING',
  },
        {
    href: 'https://trinket.io/pygame/efda26ac65ac',
    title: 'MAKE IT BOUNCE',
    emoji: '',
    tagline: 'make the circle bounce !',
    desc: 'Find a way to make the circle bounce.',
    bg: '#52f18ffe',
    stars: 3,
    tag: 'BUG FIXING',
  },
];

const Stars = ({ count }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4].map(i => (
      <span key={i} className={`text-xs ${i <= count ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
    ))}
  </div>
);

// Animated SVG shapes floating in the background
function FloatingShapes() {
  const shapes = [
    { type: 'circle', x: 8,  y: 15, r: 4, color: '#f43f5e22', delay: 0   },
    { type: 'rect',   x: 75, y: 5,  w: 8, h: 8,  color: '#a78bfa22', delay: 0.5 },
    { type: 'circle', x: 85, y: 70, r: 6, color: '#fb923c22', delay: 1   },
    { type: 'rect',   x: 5,  y: 60, w: 6, h: 10, color: '#facc1522', delay: 1.5 },
    { type: 'circle', x: 50, y: 88, r: 3, color: '#34d39922', delay: 0.8 },
    { type: 'rect',   x: 60, y: 15, w: 5, h: 5,  color: '#f43f5e22', delay: 1.2 },
    { type: 'circle', x: 20, y: 80, r: 3, color: '#2ecc7122', delay: 0.3 },
    { type: 'rect',   x: 90, y: 40, w: 5, h: 7,  color: '#2ecc7122', delay: 1.8 },
  ];
  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {shapes.map((s, i) => (
        <motion.g key={i}
          animate={{ y: [0, -2, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
        >
          {s.type === 'circle'
            ? <circle cx={s.x} cy={s.y} r={s.r} fill={s.color} />
            : <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={s.color} rx="0.5" />}
        </motion.g>
      ))}
    </svg>
  );
}

export default function CodingArcade() {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tick, setTick] = useState(0);

  // Blinking cursor effect
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-x-hidden"
      style={{ fontFamily: "'Courier New', monospace" }}>

      {/* Scanline overlay */}
      <div className="pointer-events-none fixed inset-0 z-50"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        }} />

      {/* Floating background shapes */}
      <FloatingShapes />

      {/* Top border decoration */}
      <div className="w-full h-1.5 bg-gradient-to-r from-rose-500 via-violet-500 via-orange-400 via-yellow-400 to-emerald-400" />

      <div className="relative z-10 max-w-4xl mx-auto px-5 py-10">

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-block border-4 border-white/10 rounded-2xl px-8 py-6 mb-4 relative"
            style={{ background: 'linear-gradient(180deg, #0d0d1a 0%, #080810 100%)', boxShadow: '0 0 60px rgba(167,139,250,0.15), inset 0 0 40px rgba(0,0,0,0.5)' }}>
            <div className="text-xs text-slate-600 uppercase tracking-widest mb-2 font-bold">INSERT COIN TO PLAY</div>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-none"
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #a78bfa 50%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 20px rgba(167,139,250,0.5))',
              }}>
              FLORESER
              <br />
              CODING ACADEMY
            </h1>
            <div className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">
              {tick % 2 === 0 ? '▶ SELECT YOUR GAME ◀' : '  SELECT YOUR GAME  '}
            </div>
          </div>
        </motion.div>

        {/* ── GAME CARDS ── */}
        <div className="space-y-3">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.href}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              onHoverStart={() => setHoveredIdx(i)}
              onHoverEnd={() => setHoveredIdx(null)}
            >
              <Link href={game.href}>
                <motion.div
                  animate={hoveredIdx === i ? { x: 6 } : { x: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="relative rounded-xl border overflow-hidden cursor-pointer group"
                  style={{
                    borderColor: hoveredIdx === i ? game.color + '80' : '#ffffff12',
                    background: hoveredIdx === i
                      ? `linear-gradient(90deg, ${game.bg} 0%, ${game.color}08 100%)`
                      : 'rgba(255,255,255,0.02)',
                    boxShadow: hoveredIdx === i ? `0 0 30px ${game.color}20, 0 0 0 1px ${game.color}30` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Left color stripe */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ background: game.color }}
                    animate={{ opacity: hoveredIdx === i ? 1 : 0.3 }}
                  />

                  <div className="flex items-center gap-4 px-5 py-4 pl-6">
                    {/* Number */}
                    <div className="text-slate-700 font-black text-lg w-5 shrink-0 text-center">
                      {String(i + 1).padStart(2, '0')}
                    </div>

                    {/* Emoji */}
                    <motion.div
                      className="text-3xl shrink-0 w-10 text-center"
                      animate={hoveredIdx === i ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      {game.emoji}
                    </motion.div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-black text-lg uppercase tracking-wide" style={{ color: game.color }}>
                          {game.title}
                        </span>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest"
                          style={{ color: game.color, borderColor: game.color + '40', background: game.color + '12' }}>
                          {game.tag}
                        </span>
                        <Stars count={game.stars} />
                      </div>
                      <p className="text-slate-100 text-xs leading-relaxed hidden md:block">
                        {game.desc}
                      </p>
                      <p className="text-slate-400 text-xs font-bold md:hidden">
                        {game.tagline}
                      </p>
                    </div>

                    {/* Arrow */}
                    <motion.div
                      className="text-2xl font-black shrink-0"
                      style={{ color: game.color }}
                      animate={hoveredIdx === i ? { x: [0, 4, 0] } : {}}
                      transition={{ duration: 0.4, repeat: hoveredIdx === i ? Infinity : 0 }}
                    >
                      ▶
                    </motion.div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
          <Image src='/robot.png' width={400} height={400}/>
        </div>

        {/* ── FOOTER ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12 space-y-1"
        >
          <div className="text-slate-200 text-[10px] uppercase tracking-widest font-bold">
            ✦ coordinates · translations · rotation · sequencing · level design ✦
          </div>
          <div className="text-orange-300 text-[10px]">
            made with ❤️ for curious minds
          </div>
        </motion.div>

      </div>

      {/* Bottom border decoration */}
      <div className="w-full h-1.5 bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 via-violet-500 to-rose-500" />
    </div>
  );
}