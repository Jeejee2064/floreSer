'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
const GRID_SIZE = 16;

// Level configuration: size and complexity
const LEVELS = [
  { size: 8, complexity: 0.3, target: 1 },   // Level 1: Small, very easy
  { size: 10, complexity: 0.4, target: 1 },  // Level 2: Medium, easy
  { size: 12, complexity: 0.5, target: 1 },  // Level 3: Medium, moderate
  { size: 14, complexity: 0.6, target: 1 },  // Level 4: Large, harder
  { size: 16, complexity: 0.7, target: 1 },  // Level 5: Largest, hardest
];

// Simple maze generation that guarantees a solvable path
function generateMaze(size, complexity = 0.7) {
  // Start with all walls
  const maze = Array(size).fill(null).map(() => Array(size).fill(1));
  
  // Create a simple path-based maze
  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  
  function carve(x, y) {
    visited[y][x] = true;
    maze[y][x] = 0;
    
    // Shuffle directions
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }
    
    for (const [dx, dy] of directions) {
      const nx = x + dx * 2;
      const ny = y + dy * 2;
      
      if (nx >= 1 && nx < size - 1 && ny >= 1 && ny < size - 1 && !visited[ny][nx]) {
        // Carve the wall between
        maze[y + dy][x + dx] = 0;
        carve(nx, ny);
      }
    }
  }
  
  // Start from (1,1) and carve to (size-2, size-2)
  carve(1, 1);
  
  // Ensure goal is reachable
  maze[size - 2][size - 2] = 0;
  maze[size - 3][size - 2] = 0;
  maze[size - 2][size - 3] = 0;
  
  // Add extra paths based on complexity (more paths = easier)
  const extraPaths = Math.floor((1 - complexity) * size * 2);
  for (let i = 0; i < extraPaths; i++) {
    const x = Math.floor(Math.random() * (size - 2)) + 1;
    const y = Math.floor(Math.random() * (size - 2)) + 1;
    maze[y][x] = 0;
  }
  
  return maze;
}

const ACTIONS = [
  { id: 'up', label: '↑', name: 'UP', color: 'from-blue-500 to-blue-600' },
  { id: 'down', label: '↓', name: 'DOWN', color: 'from-green-500 to-green-600' },
  { id: 'left', label: '←', name: 'LEFT', color: 'from-yellow-500 to-yellow-600' },
  { id: 'right', label: '→', name: 'RIGHT', color: 'from-purple-500 to-purple-600' },
];

export default function MazeNavigator() {
  const [screen, setScreen] = useState('menu');
  const [maze, setMaze] = useState([]);
  const [gridSize, setGridSize] = useState(8);
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [goalPos, setGoalPos] = useState({ x: 6, y: 6 });
  const [commands, setCommands] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [draggedAction, setDraggedAction] = useState(null);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    if (screen === 'game') {
      startNewMaze();
    }
  }, [screen]);

  function startNewMaze() {
    const levelConfig = LEVELS[level - 1];
    const size = levelConfig.size;
    const newMaze = generateMaze(size, levelConfig.complexity);
    setMaze(newMaze);
    setGridSize(size);
    setPlayerPos({ x: 1, y: 1 });
    setGoalPos({ x: size - 2, y: size - 2 });
    setCommands([]);
    setCurrentStep(0);
    setIsRunning(false);
    setFeedback(null);
  }

  function addCommand(actionId) {
    setCommands([...commands, { id: crypto.randomUUID(), action: actionId, steps: 1 }]);
  }

  function updateCommandSteps(id, steps) {
    setCommands(commands.map(cmd => 
      cmd.id === id ? { ...cmd, steps: Math.max(1, Math.min(10, parseInt(steps) || 1)) } : cmd
    ));
  }

  function removeCommand(id) {
    setCommands(commands.filter(cmd => cmd.id !== id));
  }

  async function runCommands() {
    if (commands.length === 0) return;
    
    setIsRunning(true);
    setCurrentStep(0);
    let pos = { ...playerPos };
    
    for (let i = 0; i < commands.length; i++) {
      setCurrentStep(i);
      const cmd = commands[i];
      const action = ACTIONS.find(a => a.id === cmd.action);
      
      for (let step = 0; step < cmd.steps; step++) {
        let newPos = { ...pos };
        
        if (action.id === 'up') newPos.y -= 1;
        else if (action.id === 'down') newPos.y += 1;
        else if (action.id === 'left') newPos.x -= 1;
        else if (action.id === 'right') newPos.x += 1;
        
        // Check bounds and walls
        if (newPos.x < 0 || newPos.x >= gridSize || 
            newPos.y < 0 || newPos.y >= gridSize || 
            maze[newPos.y][newPos.x] === 1) {
          setFeedback('collision');
          setIsRunning(false);
          setTimeout(() => {
            setFeedback(null);
            setPlayerPos({ x: 1, y: 1 });
            setCurrentStep(0);
          }, 1500);
          return;
        }
        
        pos = newPos;
        setPlayerPos(pos);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    setCurrentStep(commands.length);
    
    // Check if reached goal
    if (pos.x === goalPos.x && pos.y === goalPos.y) {
      setFeedback('success');
      setScore(score + 1);
      setTimeout(() => {
        setFeedback(null);
        if (score + 1 >= 5) {
          setScreen('victory');
        } else {
          setLevel(level + 1);
          startNewMaze();
        }
      }, 1500);
    } else {
      setFeedback('incomplete');
      setTimeout(() => {
        setFeedback(null);
        setPlayerPos({ x: 1, y: 1 });
        setCurrentStep(0);
      }, 1500);
    }
    
    setIsRunning(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 md:p-8 flex items-center justify-center">
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center max-w-md w-full px-4"
          >
            <motion.h1 
              className="text-5xl md:text-7xl font-black mb-4 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              MAZE CODER
            </motion.h1>
            <p className="text-lg md:text-xl mb-8 md:mb-12 text-slate-300">
              Program your path through the maze!
            </p>
            
            <motion.button
              onClick={() => {
                setScore(0);
                setLevel(1);
                setScreen('game');
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-5 md:py-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black rounded-2xl text-xl md:text-2xl shadow-lg"
            >
              START ADVENTURE
            </motion.button>
                      <Link
  href="/coding"
  className="block w-full py-6 mt-6  text-white font-black rounded-2xl text-xl hover:bg-pink-600 transition-all shadow-lg"
>
EXIT</Link>
          </motion.div>
        )}

        {screen === 'game' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-7xl"
          >
            <div className="flex justify-between items-center mb-4 md:mb-6 gap-2">
              <button
                onClick={() => setScreen('menu')}
                className="bg-slate-800 px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold hover:bg-slate-700 transition-colors text-sm md:text-base"
              >
                ← EXIT
              </button>
              <div className="flex gap-2 md:gap-4 items-center">
                <div className="bg-slate-800 px-3 md:px-6 py-2 md:py-3 rounded-lg font-bold text-sm md:text-base">
                  LVL {level}
                </div>
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-3 md:px-6 py-2 md:py-3 rounded-lg font-bold text-sm md:text-base">
                  ⭐ {score}/5
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-3 md:gap-4" style={{ height: 'calc(100vh - 120px)' }}>
              {/* Maze Grid */}
              <div className="bg-slate-800/50 p-3 md:p-4 rounded-2xl backdrop-blur-sm flex flex-col h-full overflow-hidden">
                <h2 className="text-base md:text-lg font-bold mb-2 text-center">Navigate the Maze</h2>
                <div 
                  className="relative bg-gradient-to-br from-slate-950 to-slate-900 rounded-xl p-2 shadow-2xl border-4 border-slate-700 flex-1 overflow-hidden flex items-center justify-center"
                >
                  <div className="w-full h-full max-w-full max-h-full" style={{ aspectRatio: '1/1' }}>
                    <div className="grid gap-0.5 md:gap-1 h-full w-full" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
                    {maze.map((row, y) => 
                      row.map((cell, x) => {
                        const isPlayer = playerPos.x === x && playerPos.y === y;
                        const isGoal = goalPos.x === x && goalPos.y === y;
                        const isWall = cell === 1;
                        
                        return (
                          <motion.div
                            key={`${x}-${y}`}
                            className={`relative rounded ${
                              isWall 
                                ? 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-inner' 
                                : 'bg-slate-900/40'
                            }`}
                            style={{
                              boxShadow: isWall ? 'inset 0 2px 4px rgba(0,0,0,0.5)' : 'none'
                            }}
                          >
                            {isGoal && !isPlayer && (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-0 bg-green-500/20 rounded flex items-center justify-center"
                              >
                                <span className="text-base md:text-xl">🏁</span>
                              </motion.div>
                            )}
                            
                            {isPlayer && !feedback && (
                              <motion.div
                                layoutId="player"
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 rounded shadow-lg flex items-center justify-center"
                                style={{
                                  boxShadow: '0 0 15px rgba(251, 146, 60, 0.6)'
                                }}
                              >
                                <span className="text-base md:text-xl">🤖</span>
                              </motion.div>
                            )}
                            
                            {isPlayer && feedback === 'collision' && (
                              <motion.div
                                initial={{ scale: 1 }}
                                animate={{ scale: [1, 1.5, 0], rotate: [0, 180, 360] }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-0 flex items-center justify-center"
                              >
                                <span className="text-xl md:text-3xl">💥</span>
                              </motion.div>
                            )}
                            
                            {isPlayer && feedback === 'success' && (
                              <motion.div
                                initial={{ scale: 1 }}
                                animate={{ scale: [1, 1.3, 1.3], rotate: [0, 0, 360] }}
                                transition={{ duration: 0.8 }}
                                className="absolute inset-0 flex items-center justify-center"
                              >
                                <span className="text-xl md:text-3xl">🎉</span>
                              </motion.div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                  </div>
                </div>
              </div>

              {/* Command Panel */}
              <div className="bg-slate-800/50 p-3 md:p-4 rounded-2xl backdrop-blur-sm flex flex-col h-full overflow-hidden">
                <h2 className="text-base md:text-lg font-bold mb-2 text-center">Program Commands</h2>
                
                {/* Available Actions */}
                <div className="mb-2 flex-shrink-0">
                  <p className="text-[10px] md:text-xs text-slate-400 mb-1">Tap to add:</p>
                  <div className="grid grid-cols-4 gap-1 md:gap-1.5">
                    {ACTIONS.map(action => (
                      <motion.button
                        key={action.id}
                        onClick={() => !isRunning && addCommand(action.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isRunning}
                        className={`bg-gradient-to-br ${action.color} p-1.5 md:p-2 rounded-lg font-black text-center select-none shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="text-xl md:text-2xl">{action.label}</div>
                        <div className="text-[8px] md:text-[10px] mt-0.5">{action.name}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Command Queue */}
                <div className="flex-1 bg-black/30 rounded-xl p-2 mb-2 overflow-y-auto" style={{ minHeight: 0 }}>
                  <p className="text-[10px] md:text-xs text-slate-400 mb-1">Commands:</p>
                  {commands.length === 0 ? (
                    <div className="text-center text-slate-500 py-4 text-[10px] md:text-xs">
                      Tap actions to add
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <AnimatePresence>
                        {commands.map((cmd, index) => {
                          const action = ACTIONS.find(a => a.id === cmd.action);
                          return (
                            <motion.div
                              key={cmd.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ 
                                opacity: 1, 
                                x: 0,
                                scale: currentStep === index && isRunning ? 1.05 : 1,
                              }}
                              exit={{ opacity: 0, x: 20 }}
                              className={`bg-gradient-to-br ${action.color} p-1.5 md:p-2 rounded-lg flex items-center gap-1.5 ${
                                currentStep === index && isRunning ? 'ring-2 ring-white shadow-lg' : ''
                              }`}
                            >
                              <div className="text-lg md:text-xl">{action.label}</div>
                              <span className="font-bold flex-1 text-[10px] md:text-xs">{action.name}</span>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={cmd.steps}
                                onChange={(e) => updateCommandSteps(cmd.id, e.target.value)}
                                disabled={isRunning}
                                className="w-8 md:w-10 bg-black/50 border-2 border-white/30 rounded px-1 py-0.5 text-center font-bold text-[10px] md:text-xs"
                              />
                              <button
                                onClick={() => removeCommand(cmd.id)}
                                disabled={isRunning}
                                className="text-white/80 hover:text-white font-bold text-sm md:text-base px-0.5"
                              >
                                ✕
                              </button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <motion.button
                    onClick={runCommands}
                    disabled={isRunning || commands.length === 0}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 py-2.5 md:py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-black text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isRunning ? '⏳' : '▶️ RUN'}
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setCommands([]);
                      setPlayerPos({ x: 1, y: 1 });
                      setCurrentStep(0);
                    }}
                    disabled={isRunning}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 rounded-xl font-bold disabled:opacity-50 text-sm md:text-base"
                  >
                    🔄
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'victory' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center px-4"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-7xl md:text-9xl mb-4 md:mb-6"
            >
              🏆
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black mb-4 md:mb-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              MASTER CODER!
            </h1>
            <p className="text-2xl md:text-3xl mb-8 md:mb-12 text-slate-300">
              You've conquered all mazes! 🎉
            </p>
            <motion.button
              onClick={() => setScreen('menu')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 md:px-12 py-5 md:py-6 bg-white text-black font-black rounded-xl text-xl md:text-2xl"
            >
              PLAY AGAIN
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}