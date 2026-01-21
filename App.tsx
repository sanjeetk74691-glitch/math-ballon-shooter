
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, UserStats, LevelConfig, Balloon, BalloonType, Particle } from './types.ts';
import { LEVELS, COLORS } from './constants.ts';
import { generateProblem } from './utils/mathHelper.ts';
import { playSound, setMuted, getMuted } from './utils/soundManager.ts';
import GameButton from './components/ui/GameButton.tsx';
import BalloonComponent from './components/game/BalloonComponent.tsx';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.SPLASH);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    score: 0,
    lives: 3,
    combo: 0,
    maxCombo: 0,
    level: 1,
    stars: 0
  });
  
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentLevelConfig, setCurrentLevelConfig] = useState<LevelConfig>(LEVELS[0]);
  const [options, setOptions] = useState<number[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [isFrozen, setIsFrozen] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [legalView, setLegalView] = useState<'privacy' | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(getMuted());

  const gameLoopRef = useRef<number>(null);
  const lastSpawnRef = useRef<number>(0);
  const skyRef = useRef<HTMLDivElement>(null);

  // Splash timeout
  useEffect(() => {
    if (gameState === GameState.SPLASH) {
      const timer = setTimeout(() => {
        setLoadingComplete(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const createExplosion = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    const count = 30; 
    const explosionColors = [color, '#ffffff', '#fbbf24', '#f472b6', '#4ade80', '#60a5fa'];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.5);
      const speed = 4 + Math.random() * 8;
      newParticles.push({
        id: Math.random().toString(36).substr(2, 9),
        x: x + 45,
        y: y + 45,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: explosionColors[Math.floor(Math.random() * explosionColors.length)],
        life: 1,
        size: 4 + Math.random() * 10
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const updateGame = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const now = Date.now();
    const spawnRate = 1200 / currentLevelConfig.speed;
    if (now - lastSpawnRef.current > spawnRate) {
      if (balloons.length < currentLevelConfig.maxBalloons) {
        spawnBalloon();
        lastSpawnRef.current = now;
      }
    }

    setBalloons(prev => {
      const updated = prev.map(b => ({
        ...b,
        y: b.y + (isFrozen ? b.speed * 0.4 : b.speed)
      }));

      const missed = updated.filter(b => b.y > (skyRef.current?.clientHeight || 800) && !b.isPopping);
      if (missed.length > 0) {
        const hasPenalized = missed.some(b => b.type !== BalloonType.BOMB);
        if (hasPenalized) {
          playSound('wrong');
          setStats(s => ({ ...s, lives: Math.max(0, s.lives - 1), combo: 0 }));
          if (stats.lives <= 1) setGameState(GameState.GAME_OVER);
        }
      }
      return updated.filter(b => b.y < (skyRef.current?.clientHeight || 800));
    });

    setParticles(prev => {
      return prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.2, // Gravity
          life: p.life - 0.03,
          size: p.size * 0.96
        }))
        .filter(p => p.life > 0);
    });

    gameLoopRef.current = requestAnimationFrame(updateGame);
  }, [gameState, balloons.length, currentLevelConfig, isFrozen, stats.lives]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      gameLoopRef.current = requestAnimationFrame(updateGame);
    } else if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, updateGame]);

  const updateOptionsList = useCallback((currentBalloons: Balloon[]) => {
    const activeAnswers = Array.from(new Set(currentBalloons
      .filter(b => !b.isPopping && b.type !== BalloonType.BOMB)
      .map(b => b.problem.answer)
    ));

    setOptions(prev => {
      const combined = new Set([...activeAnswers]);
      let safety = 0;
      while (combined.size < 6 && safety < 100) {
        const rand = Math.floor(Math.random() * (currentLevelConfig.range[1] * 2)) + 1;
        combined.add(rand);
        safety++;
      }
      return Array.from(combined).sort((a, b) => a - b);
    });
  }, [currentLevelConfig.range]);

  const spawnBalloon = useCallback(() => {
    if (!skyRef.current) return;
    const { width } = skyRef.current.getBoundingClientRect();
    const typeRoll = Math.random();
    let type = BalloonType.NORMAL;
    if (typeRoll > 0.96) type = BalloonType.GOLDEN;
    else if (typeRoll > 0.93) type = BalloonType.BOMB;
    else if (typeRoll > 0.90) type = BalloonType.FREEZE;
    else if (typeRoll > 0.87) type = BalloonType.STAR;

    const problem = generateProblem(currentLevelConfig.operations, currentLevelConfig.range);
    
    const newBalloon: Balloon = {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * (width - 100) + 10,
      y: -150,
      type,
      problem,
      speed: currentLevelConfig.speed + Math.random() * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      isPopping: false
    };

    setBalloons(prev => {
      const next = [...prev, newBalloon];
      updateOptionsList(next);
      return next;
    });
  }, [currentLevelConfig, updateOptionsList]);

  const handleAnswer = (answer: number) => {
    const correctBalloons = balloons.filter(b => b.problem.answer === answer && !b.isPopping);
    if (correctBalloons.length > 0) {
      popBalloon(correctBalloons[0]);
    } else {
      playSound('wrong');
      setStats(s => ({ ...s, lives: Math.max(0, s.lives - 1), combo: 0 }));
      if (stats.lives <= 1) setGameState(GameState.GAME_OVER);
    }
  };

  const popBalloon = (balloon: Balloon) => {
    if (balloon.isPopping) return;
    setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, isPopping: true } : b));
    playSound('pop');
    createExplosion(balloon.x, balloon.y, balloon.color);
    
    let scoreGain = 10 * multiplier;
    if (balloon.type === BalloonType.GOLDEN) scoreGain += 50;
    if (balloon.type === BalloonType.BOMB) {
      playSound('wrong');
      setStats(s => ({ ...s, lives: Math.max(0, s.lives - 1), combo: 0 }));
      if (stats.lives <= 1) setGameState(GameState.GAME_OVER);
      return;
    }
    if (balloon.type === BalloonType.FREEZE) {
      setIsFrozen(true);
      setTimeout(() => setIsFrozen(false), 5000);
    }
    if (balloon.type === BalloonType.STAR) {
      setMultiplier(2);
      setTimeout(() => setMultiplier(1), 8000);
    }

    setStats(s => {
      const newScore = s.score + scoreGain + (s.combo * 5);
      if (newScore >= 500 && currentLevelConfig.id < 20) {
         setTimeout(() => setGameState(GameState.LEVEL_COMPLETE), 500);
      }
      return {
        ...s,
        score: newScore,
        combo: s.combo + 1,
        maxCombo: Math.max(s.maxCombo, s.combo + 1)
      };
    });

    setTimeout(() => {
      setBalloons(prev => prev.filter(b => b.id !== balloon.id));
    }, 200);
  };

  const startLevel = (levelId: number) => {
    const config = LEVELS.find(l => l.id === levelId) || LEVELS[0];
    setCurrentLevelConfig(config);
    setStats(prev => ({ ...prev, lives: 3, score: 0, combo: 0 }));
    setBalloons([]);
    setParticles([]);
    setOptions([]);
    setGameState(GameState.PLAYING);
    setIsFrozen(false);
    playSound('click');
  };

  const handleStartGame = () => {
    playSound('click');
    setGameState(GameState.HOME);
  };

  const toggleMute = () => {
    const newVal = !isAudioMuted;
    setIsAudioMuted(newVal);
    setMuted(newVal);
    playSound('click');
  };

  const closeSettings = () => {
    setShowSettings(false);
    setLegalView(null);
  };

  // --- RENDERING ---

  if (gameState === GameState.SPLASH) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-indigo-950 flex flex-col items-center justify-center text-white p-6 text-center z-[500] screen-fade-in">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute animate-float" style={{left: `${i * 15}%`, top: `${20 + (i * 10)}%`, fontSize: '40px'}}>🎈</div>
          ))}
        </div>
        
        <div className="relative mb-12">
          <div className="w-56 h-56 bg-white/10 rounded-full flex items-center justify-center animate-float shadow-[0_0_100px_rgba(255,255,255,0.1)]">
            <span className="text-[120px] drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">🎈</span>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-4xl shadow-lg border-4 border-white animate-bounce">
            ✨
          </div>
        </div>
        
        <h1 className="text-7xl font-game mb-4 tracking-tighter drop-shadow-[0_10px_0_#1d4ed8] uppercase scale-110">Math Pop!</h1>
        <p className="text-xl font-bold text-blue-200 mb-12 uppercase tracking-[0.2em] opacity-80">Educational Arcade</p>
        
        {!loadingComplete ? (
          <div className="w-64 h-4 bg-white/20 rounded-full overflow-hidden border-2 border-white/10">
            <div className="h-full bg-yellow-400 animate-progress"></div>
          </div>
        ) : (
          <GameButton onClick={handleStartGame} variant="secondary" className="py-7 px-12 text-3xl shadow-[0_12px_0_0_#d97706] rounded-[40px] animate-bounce">
            🚀 GET STARTED
          </GameButton>
        )}
      </div>
    );
  }

  if (gameState === GameState.HOME) {
    return (
      <div className="fixed inset-0 sky-bg flex flex-col items-center justify-around p-8 bg-[url('https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center screen-fade-in">
        <div className="absolute inset-0 bg-blue-600/30 backdrop-blur-[2px]"></div>
        
        <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-200 rounded-full shadow-[0_0_80px_rgba(253,224,71,0.6)] animate-pulse opacity-70"></div>

        <div className="relative z-10 text-center">
          <div className="inline-block animate-float">
             <span className="text-[140px] mb-4 block drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)]">🎈</span>
          </div>
          <h1 className="text-8xl font-game text-white drop-shadow-[0_10px_0_#1d4ed8] mb-2 leading-tight tracking-tighter uppercase">MATH<br/>BALLOON</h1>
          <div className="inline-block bg-yellow-400 px-8 py-3 rounded-3xl rotate-[-3deg] shadow-2xl border-4 border-white">
            <h2 className="text-3xl font-game text-blue-900 uppercase">Pro Master</h2>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col gap-6 w-full max-w-xs">
          <GameButton onClick={() => { playSound('click'); setGameState(GameState.LEVEL_MAP); }} variant="secondary" className="py-8 text-4xl shadow-[0_12px_0_0_#d97706] rounded-[45px] border-none uppercase">
            🚀 PLAY
          </GameButton>
          <div className="grid grid-cols-2 gap-4">
             <GameButton onClick={() => {}} variant="primary" className="py-5 text-xl uppercase">🏆 RANK</GameButton>
             <GameButton onClick={() => setShowSettings(true)} variant="primary" className="py-5 text-xl uppercase">⚙️ OPTS</GameButton>
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 screen-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={closeSettings} />
            <div className="relative bg-white rounded-[50px] w-full max-w-sm overflow-hidden shadow-2xl border-t-[12px] border-blue-500">
              <div className="p-8 text-center max-h-[85vh] flex flex-col">
                <h3 className="text-4xl font-game text-blue-600 mb-6 uppercase">Settings</h3>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {!legalView ? (
                    <div className="flex flex-col gap-5 mb-8">
                      <div className="flex items-center justify-between bg-blue-50 p-6 rounded-[30px] border-2 border-blue-100">
                        <span className="font-black text-blue-800 text-xl">{isAudioMuted ? '🔇' : '🔊'} SOUND</span>
                        <button onClick={toggleMute} className={`w-20 h-10 rounded-full transition-colors relative ${isAudioMuted ? 'bg-gray-300' : 'bg-green-400'}`}>
                          <div className={`absolute top-1 w-8 h-8 bg-white rounded-full transition-all ${isAudioMuted ? 'left-1' : 'left-11'}`} />
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => setLegalView('privacy')}
                        className="w-full py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors uppercase tracking-wider"
                      >
                        Privacy Policy
                      </button>

                      <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                        <p className="text-sm text-yellow-800 font-bold">Kid-Safe Gaming</p>
                        <p className="text-[10px] text-yellow-600 mt-1 uppercase">Math Pop! is designed for children. We do not collect any personal data.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-left bg-blue-50/50 p-6 rounded-3xl border-2 border-blue-100/50 mb-6">
                      <button onClick={() => setLegalView(null)} className="text-blue-500 font-black mb-4 flex items-center gap-2">⬅️ BACK</button>
                      <h4 className="text-xl font-game text-blue-800 mb-4 uppercase">Privacy Policy</h4>
                      <div className="text-[12px] text-blue-900/80 font-bold leading-relaxed space-y-4">
                        <p>Welcome to Math Pop!</p>
                        <p><strong>1. Data Collection:</strong> We do NOT collect any personal information. No names, emails, or location data are stored or shared.</p>
                        <p><strong>2. Game Progress:</strong> High scores and level progress are stored locally on your device only.</p>
                        <p><strong>3. COPPA Compliance:</strong> This app is fully compliant with the Children's Online Privacy Protection Act. We do not track children.</p>
                        <p><strong>4. Third Parties:</strong> We do not use third-party tracking or analytics that identify individual users.</p>
                        <p><strong>5. Contact:</strong> For any privacy concerns, please contact our support team.</p>
                        <p className="pt-4 opacity-50 italic">Last Updated: March 2024</p>
                      </div>
                    </div>
                  )}
                </div>

                <GameButton onClick={closeSettings} variant="secondary" className="w-full mt-4 py-5 shadow-[0_8px_0_0_#d97706]">CLOSE</GameButton>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === GameState.LEVEL_MAP) {
    return (
      <div className="fixed inset-0 sky-bg overflow-y-auto p-4 flex flex-col items-center z-[400] screen-fade-in">
        <div className="flex justify-between w-full max-w-md items-center mb-10 sticky top-0 bg-white/90 backdrop-blur-xl py-6 z-20 px-6 rounded-[40px] shadow-2xl border border-white/50">
          <button onClick={() => { playSound('click'); setGameState(GameState.HOME); }} className="bg-blue-500 text-white p-4 rounded-3xl shadow-lg text-3xl active:scale-90 transition-transform">🏠</button>
          <h2 className="text-3xl font-game text-blue-600 uppercase">LEVELS</h2>
          <div className="bg-yellow-100 px-5 py-2 rounded-3xl flex items-center gap-2 border-2 border-yellow-200">
             <span className="text-2xl">⭐</span>
             <span className="font-game text-yellow-700 text-xl">{stats.stars}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-6 w-full max-w-md pb-24 px-4">
          {LEVELS.map((lvl) => (
            <button 
              key={lvl.id}
              onClick={() => startLevel(lvl.id)}
              className={`aspect-square rounded-[30px] font-game text-3xl flex items-center justify-center shadow-xl transform active:scale-90 transition-all border-b-[10px]
                ${lvl.id <= stats.level 
                  ? 'bg-gradient-to-b from-yellow-300 to-yellow-500 text-blue-900 border-yellow-700' 
                  : 'bg-white/30 text-white/50 border-white/20 cursor-not-allowed'}
              `}
              disabled={lvl.id > stats.level}
            >
              {lvl.id}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === GameState.PLAYING || gameState === GameState.PAUSED) {
    return (
      <div className="fixed inset-0 sky-bg flex flex-col select-none touch-none overflow-hidden h-screen screen-fade-in">
        <div className="absolute top-0 left-0 right-0 z-50 px-6 pt-12 pointer-events-none flex justify-between items-start">
          <div className="flex gap-4 pointer-events-auto">
            <button onClick={() => { playSound('click'); setGameState(GameState.PAUSED); }} className="bg-white/90 backdrop-blur p-4 rounded-[25px] shadow-2xl active:scale-90 transition-transform border-b-4 border-gray-200 text-3xl">⏸️</button>
            <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-[25px] shadow-2xl border-b-4 border-gray-200 flex flex-col justify-center">
              <p className="text-[12px] font-black text-blue-400 uppercase tracking-widest leading-none">SCORE</p>
              <p className="text-2xl font-game text-blue-600 leading-none">{stats.score}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="bg-white/90 backdrop-blur px-6 py-3 rounded-[25px] shadow-2xl border-b-4 border-gray-200 flex gap-2 items-center">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`text-3xl transition-all duration-500 ${i < stats.lives ? 'scale-110 drop-shadow-md' : 'opacity-20 scale-75 grayscale'}`}>❤️</span>
              ))}
            </div>
          </div>
        </div>

        <div ref={skyRef} className={`flex-1 relative overflow-hidden transition-all duration-700 ${isFrozen ? 'brightness-125 saturate-150' : ''}`}>
          {particles.map(p => (
            <div 
              key={p.id}
              className="absolute rounded-full pointer-events-none particle-sparkle"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.life,
                boxShadow: `0 0 15px ${p.color}, 0 0 5px #fff`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          {balloons.map(balloon => (
            <BalloonComponent key={balloon.id} balloon={balloon} />
          ))}
          
          {isFrozen && <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-9xl opacity-30 animate-pulse">❄️</div>}
        </div>
        
        <div className="relative z-[60] px-6 pb-[50px] pt-8 bg-white/95 backdrop-blur-2xl border-t-[10px] border-blue-500 rounded-t-[60px] shadow-[0_-30px_60px_rgba(0,0,0,0.15)]">
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {options.map(ans => (
              <button 
                key={ans} 
                onClick={() => handleAnswer(ans)} 
                className="py-7 bg-blue-500 text-white font-game text-4xl rounded-[35px] btn-3d border-blue-700 shadow-2xl flex items-center justify-center active:bg-blue-600 transition-all"
              >
                {ans}
              </button>
            ))}
          </div>
        </div>

        {gameState === GameState.PAUSED && (
          <div className="absolute inset-0 z-[100] bg-blue-900/60 backdrop-blur-md flex items-center justify-center p-8">
            <div className="bg-white p-12 rounded-[60px] shadow-2xl w-full max-w-sm text-center border-t-[15px] border-blue-500">
              <h2 className="text-5xl font-game text-blue-600 mb-10 uppercase tracking-tight">Paused</h2>
              <div className="flex flex-col gap-5">
                <GameButton onClick={() => setGameState(GameState.PLAYING)} variant="success" className="py-6 text-2xl uppercase">Resume</GameButton>
                <GameButton onClick={() => { playSound('click'); setGameState(GameState.LEVEL_MAP); }} variant="primary" className="py-6 text-2xl uppercase">Levels</GameButton>
                <GameButton onClick={() => { playSound('click'); setGameState(GameState.HOME); }} variant="danger" className="py-6 text-2xl uppercase">Quit</GameButton>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === GameState.LEVEL_COMPLETE) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-500 to-emerald-700 flex flex-col items-center justify-center p-8 text-white z-[200] screen-fade-in">
        <span className="text-[120px] mb-8 animate-bounce drop-shadow-[0_10px_30px_rgba(0,0,0,0.3)]">🌟</span>
        <h2 className="text-6xl font-game mb-4 text-center tracking-tighter uppercase">VICTORY!</h2>
        <div className="bg-white/20 p-10 rounded-[50px] w-full max-w-sm mb-12 shadow-2xl border border-white/30 backdrop-blur-lg">
          <div className="flex justify-between items-center mb-4 uppercase"><span className="text-xl font-black">Score</span><span className="text-3xl font-game">{stats.score}</span></div>
          <div className="flex justify-between items-center uppercase"><span className="text-xl font-black">Stars Earned</span><span className="text-3xl font-game">⭐⭐⭐</span></div>
        </div>
        <div className="flex flex-col gap-5 w-full max-w-sm">
          <GameButton onClick={() => { setStats(s => ({ ...s, level: Math.max(s.level, currentLevelConfig.id + 1), stars: s.stars + 3 })); startLevel(currentLevelConfig.id + 1); }} variant="secondary" className="py-7 text-3xl shadow-[0_10px_0_0_#d97706] uppercase">Next Level ➡️</GameButton>
          <GameButton onClick={() => setGameState(GameState.LEVEL_MAP)} variant="primary" className="py-6 text-2xl uppercase">Map</GameButton>
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-600 to-rose-900 flex flex-col items-center justify-center p-8 text-white z-[200] screen-fade-in">
        <div className="relative mb-12">
          <span className="text-[100px] opacity-40 grayscale">🎈</span>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl">💥</span>
        </div>
        <h2 className="text-6xl font-game mb-12 uppercase tracking-tighter">TRY AGAIN!</h2>
        <div className="flex flex-col gap-5 w-full max-w-sm">
          <GameButton onClick={() => startLevel(currentLevelConfig.id)} variant="secondary" className="py-7 text-3xl shadow-[0_10px_0_0_#d97706] uppercase">Retry 🔄</GameButton>
          <GameButton onClick={() => setGameState(GameState.HOME)} variant="danger" className="py-6 text-2xl uppercase">Quit</GameButton>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
