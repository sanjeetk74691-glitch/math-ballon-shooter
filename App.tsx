
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, UserStats, LevelConfig, Balloon, BalloonType, Particle } from './types.ts';
import { LEVELS, COLORS } from './constants.ts';
import { generateProblem } from './utils/mathHelper.ts';
import { playSound, setMuted, getMuted } from './utils/soundManager.ts';
import GameButton from './components/ui/GameButton.tsx';
import BalloonComponent from './components/game/BalloonComponent.tsx';

// Mock Leaderboard Data
const MOCK_RANKING = [
  { name: "SuperPopper", score: 12450, rank: 1, avatar: "🦁" },
  { name: "MathGenius", score: 11200, rank: 2, avatar: "🦊" },
  { name: "BalloonKing", score: 9800, rank: 3, avatar: "🐯" },
  { name: "QuickSolve", score: 8500, rank: 4, avatar: "🐼" },
  { name: "StarCoder", score: 7200, rank: 5, avatar: "🐨" },
];

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

  // New UI states for Rank and Legal
  const [showSettings, setShowSettings] = useState(false);
  const [showRank, setShowRank] = useState(false);
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(getMuted());

  const gameLoopRef = useRef<number>(null);
  const lastSpawnRef = useRef<number>(0);
  const skyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState === GameState.SPLASH) {
      const timer = setTimeout(() => {
        setLoadingComplete(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const createExplosion = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    const count = 35; 
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
        size: 3 + Math.random() * 9
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
          vy: p.vy + 0.22, 
          life: p.life - 0.035,
          size: p.size * 0.95
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
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute animate-float" style={{left: `${i * 15}%`, top: `${20 + (i * 10)}%`, fontSize: '40px'}}>🎈</div>
          ))}
        </div>
        
        <div className="relative mb-12">
          <div className="w-56 h-56 bg-white/10 rounded-full flex items-center justify-center animate-float shadow-[0_0_80px_rgba(255,255,255,0.15)] backdrop-blur-sm border border-white/10">
            <span className="text-[110px] drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">🎈</span>
          </div>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-3xl shadow-lg border-4 border-white animate-bounce">
            ✨
          </div>
        </div>
        
        <h1 className="text-6xl sm:text-7xl font-game mb-2 tracking-tighter text-outline uppercase scale-105">Math Pop!</h1>
        <p className="text-lg font-bold text-blue-300 mb-12 uppercase tracking-[0.2em] opacity-80">Academy Adventure</p>
        
        {!loadingComplete ? (
          <div className="w-64 h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-yellow-400 animate-progress shadow-[0_0_15px_rgba(251,191,36,0.6)]"></div>
          </div>
        ) : (
          <GameButton onClick={handleStartGame} variant="secondary" className="py-6 px-10 text-2xl shadow-[0_8px_0_0_#d97706] rounded-full animate-pulse">
            🚀 GET STARTED
          </GameButton>
        )}
      </div>
    );
  }

  if (gameState === GameState.HOME) {
    return (
      <div className="fixed inset-0 sky-bg flex flex-col items-center justify-between py-12 px-8 screen-fade-in" style={{paddingTop: 'calc(40px + var(--safe-area-inset-top))', paddingBottom: 'calc(40px + var(--safe-area-inset-bottom))'}}>
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="cloud" style={{width: 150 + Math.random() * 100, height: 40, top: 10 + i * 20 + '%', left: '-200px', animationDuration: 15 + Math.random() * 10 + 's', animationDelay: i * 2 + 's'}} />
          ))}
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-32 h-32 mb-4 bg-white/20 rounded-full flex items-center justify-center animate-float border-2 border-white/30 backdrop-blur-md">
             <span className="text-7xl drop-shadow-xl">🎈</span>
          </div>
          <h1 className="text-6xl sm:text-7xl font-game text-white text-outline leading-none text-center tracking-tight mb-2">MATH<br/>BALLOON</h1>
          <div className="bg-yellow-400 px-6 py-2 rounded-2xl rotate-[-2deg] shadow-xl border-4 border-white mt-2">
            <h2 className="text-2xl font-game text-blue-900 uppercase">PRO MASTER</h2>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col gap-5 w-full max-w-xs">
          <GameButton onClick={() => { playSound('click'); setGameState(GameState.LEVEL_MAP); }} variant="secondary" className="py-6 text-3xl shadow-[0_10px_0_0_#d97706] rounded-full uppercase">
            🚀 PLAY NOW
          </GameButton>
          <div className="grid grid-cols-2 gap-4">
             <GameButton onClick={() => setShowRank(true)} variant="primary" className="py-4 text-lg uppercase font-black">🏆 RANK</GameButton>
             <GameButton onClick={() => setShowSettings(true)} variant="primary" className="py-4 text-lg uppercase font-black">⚙️ OPTS</GameButton>
          </div>
        </div>

        {/* RANK / LEADERBOARD MODAL */}
        {showRank && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 screen-fade-in">
            <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-md" onClick={() => setShowRank(false)} />
            <div className="relative bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl border-t-[10px] border-yellow-400">
               <div className="p-8">
                  <h3 className="text-4xl font-game text-blue-600 mb-6 uppercase text-center">Top Poppers</h3>
                  <div className="space-y-3 mb-8">
                    {MOCK_RANKING.map((player) => (
                      <div key={player.rank} className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl border border-blue-100 transition-all hover:scale-[1.02]">
                        <div className="flex items-center gap-4">
                          <span className={`w-8 h-8 flex items-center justify-center rounded-full font-game text-white shadow-md ${player.rank === 1 ? 'bg-yellow-400' : player.rank === 2 ? 'bg-slate-400' : player.rank === 3 ? 'bg-amber-600' : 'bg-blue-300'}`}>
                            {player.rank}
                          </span>
                          <span className="text-2xl">{player.avatar}</span>
                          <span className="font-black text-blue-800 uppercase text-lg">{player.name}</span>
                        </div>
                        <span className="font-game text-blue-500 text-xl">{player.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-yellow-100 p-4 rounded-3xl border-2 border-yellow-300 flex justify-between items-center mb-8">
                    <span className="font-black text-yellow-800 uppercase">Your Best</span>
                    <span className="font-game text-yellow-600 text-2xl">{stats.maxCombo * 100}</span>
                  </div>
                  <GameButton onClick={() => setShowRank(false)} variant="secondary" className="w-full py-4 shadow-[0_6px_0_0_#d97706]">GO BACK</GameButton>
               </div>
            </div>
          </div>
        )}

        {/* SETTINGS / LEGAL MODAL */}
        {showSettings && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 screen-fade-in">
            <div className="absolute inset-0 bg-blue-950/70 backdrop-blur-lg" onClick={closeSettings} />
            <div className="relative bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl border-t-[10px] border-blue-500">
              <div className="p-8 text-center flex flex-col">
                <h3 className="text-3xl font-game text-blue-600 mb-6 uppercase">Settings</h3>
                
                <div className="flex flex-col gap-3 mb-8">
                  <div className="flex items-center justify-between bg-blue-50 p-5 rounded-3xl border-2 border-blue-100">
                    <span className="font-black text-blue-800 text-lg uppercase">{isAudioMuted ? '🔇' : '🔊'} Sound FX</span>
                    <button onClick={toggleMute} className={`w-16 h-8 rounded-full transition-all relative ${isAudioMuted ? 'bg-gray-300' : 'bg-emerald-400'}`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isAudioMuted ? 'left-1' : 'left-9'} shadow-md`} />
                    </button>
                  </div>
                  
                  <button onClick={() => setLegalView('privacy')} className="w-full py-3 bg-gray-50 text-blue-600 font-bold rounded-2xl hover:bg-blue-100 transition-colors uppercase text-sm tracking-widest border border-blue-100">
                    Privacy Policy
                  </button>
                  <button onClick={() => setLegalView('terms')} className="w-full py-3 bg-gray-50 text-blue-600 font-bold rounded-2xl hover:bg-blue-100 transition-colors uppercase text-sm tracking-widest border border-blue-100">
                    Terms of Service
                  </button>
                </div>

                <GameButton onClick={closeSettings} variant="secondary" className="w-full py-4 text-xl shadow-[0_6px_0_0_#d97706]">CLOSE</GameButton>
              </div>
            </div>
          </div>
        )}

        {/* FULL SCREEN LEGAL VIEW */}
        {legalView && (
          <div className="fixed inset-0 z-[800] bg-white flex flex-col screen-fade-in" style={{paddingTop: 'var(--safe-area-inset-top)', paddingBottom: 'var(--safe-area-inset-bottom)'}}>
             <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center">
                <h2 className="text-2xl font-game text-blue-600 uppercase">
                  {legalView === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                </h2>
                <button onClick={() => setLegalView(null)} className="bg-gray-100 p-2 rounded-xl text-2xl">✖️</button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 text-gray-700 space-y-6 leading-relaxed">
                {legalView === 'privacy' ? (
                  <>
                    <p className="font-bold text-xl">1. Information Collection</p>
                    <p>Math Balloon Academy does not collect, store, or share any personal information. We do not require account registration. All game progress and high scores are stored locally on your device.</p>
                    <p className="font-bold text-xl">2. Children's Privacy (COPPA)</p>
                    <p>Our app is designed for children. We do not collect any personal data from children. We do not use third-party tracking or behavioral advertising.</p>
                    <p className="font-bold text-xl">3. Security</p>
                    <p>Since no data is transmitted to our servers, your data remains secure on your personal device.</p>
                    <p className="font-bold text-xl">4. Changes to Policy</p>
                    <p>We may update this policy occasionally. Any changes will be reflected here in the app settings.</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-xl">1. Acceptable Use</p>
                    <p>Users are granted a non-exclusive license to use this app for personal, educational purposes. Any commercial exploitation or redistribution is prohibited.</p>
                    <p className="font-bold text-xl">2. Intellectual Property</p>
                    <p>All game assets, characters, and sounds are the property of the developers. Unauthorized reproduction is strictly forbidden.</p>
                    <p className="font-bold text-xl">3. Disclaimer</p>
                    <p>The app is provided "as is" without warranties of any kind. We are not responsible for any data loss occurring on the user's device.</p>
                    <p className="font-bold text-xl">4. Termination</p>
                    <p>We reserve the right to modify or discontinue the app at any time without notice.</p>
                  </>
                )}
             </div>
             <div className="p-6">
                <GameButton onClick={() => setLegalView(null)} variant="primary" className="w-full py-4 uppercase">I Understand</GameButton>
             </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === GameState.LEVEL_MAP) {
    return (
      <div className="fixed inset-0 sky-bg overflow-y-auto p-4 flex flex-col items-center z-[400] screen-fade-in" style={{paddingTop: 'calc(20px + var(--safe-area-inset-top))'}}>
        <div className="flex justify-between w-full max-w-md items-center mb-8 sticky top-0 bg-white/90 backdrop-blur-xl py-4 z-20 px-6 rounded-3xl shadow-xl border border-white/50">
          <button onClick={() => { playSound('click'); setGameState(GameState.HOME); }} className="bg-blue-500 text-white p-3 rounded-2xl shadow-lg text-2xl active:scale-90 transition-transform">🏠</button>
          <h2 className="text-2xl font-game text-blue-600 uppercase">MAP</h2>
          <div className="bg-yellow-100 px-4 py-1.5 rounded-2xl flex items-center gap-2 border-2 border-yellow-200 shadow-sm">
             <span className="text-xl">⭐</span>
             <span className="font-game text-yellow-700 text-lg">{stats.stars}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 w-full max-w-md pb-12 px-2">
          {LEVELS.map((lvl) => (
            <button 
              key={lvl.id}
              onClick={() => startLevel(lvl.id)}
              className={`aspect-square rounded-2xl font-game text-2xl flex items-center justify-center shadow-lg transform active:scale-90 transition-all border-b-[8px]
                ${lvl.id <= stats.level 
                  ? 'bg-gradient-to-b from-yellow-300 to-yellow-500 text-blue-900 border-yellow-700' 
                  : 'bg-white/20 text-white/40 border-white/10 cursor-not-allowed'}
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
        <div className="absolute top-0 left-0 right-0 z-50 px-6 pt-12 pointer-events-none flex justify-between items-start" style={{paddingTop: 'calc(20px + var(--safe-area-inset-top))'}}>
          <div className="flex gap-3 pointer-events-auto">
            <button onClick={() => { playSound('click'); setGameState(GameState.PAUSED); }} className="bg-white/80 backdrop-blur-md p-3.5 rounded-2xl shadow-xl active:scale-90 transition-transform border border-white/40 text-2xl">⏸️</button>
            <div className="bg-white/80 backdrop-blur-md px-5 py-2 rounded-2xl shadow-xl border border-white/40 flex flex-col justify-center">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">SCORE</p>
              <p className="text-xl font-game text-blue-600 leading-none">{stats.score}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-white/40 flex gap-1.5 items-center">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`text-2xl transition-all duration-300 ${i < stats.lives ? 'scale-110 drop-shadow-sm' : 'opacity-20 scale-75 grayscale'}`}>❤️</span>
              ))}
            </div>
          </div>
        </div>

        <div ref={skyRef} className={`flex-1 relative overflow-hidden transition-all duration-700 ${isFrozen ? 'brightness-125 saturate-150 backdrop-blue-100' : ''}`}>
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
                boxShadow: `0 0 12px ${p.color}`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          {balloons.map(balloon => (
            <BalloonComponent key={balloon.id} balloon={balloon} />
          ))}
          
          {isFrozen && <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-9xl opacity-20 animate-pulse">❄️</div>}
        </div>
        
        <div className="relative z-[60] px-6 pb-12 pt-8 bg-white/95 backdrop-blur-xl border-t-[8px] border-blue-500 rounded-t-[50px] shadow-[0_-15px_40px_rgba(0,0,0,0.1)]" style={{paddingBottom: 'calc(30px + var(--safe-area-inset-bottom))'}}>
          <div className="grid grid-cols-3 gap-3.5 max-w-md mx-auto">
            {options.map(ans => (
              <button 
                key={ans} 
                onClick={() => handleAnswer(ans)} 
                className="py-6 bg-blue-500 text-white font-game text-3xl rounded-[30px] btn-3d border-blue-700 shadow-xl flex items-center justify-center active:bg-blue-600 transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 glossy opacity-30 pointer-events-none" />
                <span className="relative z-10">{ans}</span>
              </button>
            ))}
          </div>
        </div>

        {gameState === GameState.PAUSED && (
          <div className="absolute inset-0 z-[100] bg-blue-950/60 backdrop-blur-lg flex items-center justify-center p-8">
            <div className="bg-white p-10 rounded-[45px] shadow-2xl w-full max-w-sm text-center border-t-[10px] border-blue-500">
              <h2 className="text-4xl font-game text-blue-600 mb-8 uppercase">Game Paused</h2>
              <div className="flex flex-col gap-4">
                <GameButton onClick={() => setGameState(GameState.PLAYING)} variant="success" className="py-5 text-xl uppercase">Resume</GameButton>
                <GameButton onClick={() => { playSound('click'); setGameState(GameState.LEVEL_MAP); }} variant="primary" className="py-5 text-xl uppercase">Level Map</GameButton>
                <GameButton onClick={() => { playSound('click'); setGameState(GameState.HOME); }} variant="danger" className="py-5 text-xl uppercase">Quit Game</GameButton>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === GameState.LEVEL_COMPLETE) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-500 to-teal-700 flex flex-col items-center justify-center p-8 text-white z-[200] screen-fade-in">
        <div className="relative mb-6">
          <span className="text-[120px] animate-bounce drop-shadow-[0_10px_30px_rgba(0,0,0,0.4)] block">🌟</span>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-emerald-600 font-game px-6 py-1 rounded-full text-xl shadow-lg border-2 border-white">GREAT!</div>
        </div>
        <h2 className="text-5xl font-game mb-6 text-center tracking-tight uppercase text-outline">LEVEL CLEARED!</h2>
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-[40px] w-full max-w-sm mb-10 shadow-2xl border border-white/20">
          <div className="flex justify-between items-center mb-4 uppercase"><span className="text-lg font-black opacity-80">Score</span><span className="text-3xl font-game">{stats.score}</span></div>
          <div className="flex justify-between items-center uppercase"><span className="text-lg font-black opacity-80">Stars</span><span className="text-2xl font-game">⭐⭐⭐</span></div>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <GameButton onClick={() => { setStats(s => ({ ...s, level: Math.max(s.level, currentLevelConfig.id + 1), stars: s.stars + 3 })); startLevel(currentLevelConfig.id + 1); }} variant="secondary" className="py-6 text-2xl shadow-[0_8px_0_0_#d97706] uppercase rounded-full">Next Day ➡️</GameButton>
          <GameButton onClick={() => setGameState(GameState.LEVEL_MAP)} variant="primary" className="py-5 text-xl uppercase rounded-full">Back to Map</GameButton>
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-rose-600 to-red-900 flex flex-col items-center justify-center p-8 text-white z-[200] screen-fade-in">
        <div className="relative mb-8 w-40 h-40 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
          <span className="text-[80px] grayscale opacity-40">🎈</span>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl">💥</span>
        </div>
        <h2 className="text-5xl font-game mb-10 uppercase tracking-tight text-outline">OUT OF LIVES!</h2>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <GameButton onClick={() => startLevel(currentLevelConfig.id)} variant="secondary" className="py-6 text-2xl shadow-[0_8px_0_0_#d97706] uppercase rounded-full">Try Again 🔄</GameButton>
          <GameButton onClick={() => setGameState(GameState.HOME)} variant="danger" className="py-5 text-xl uppercase rounded-full">Main Menu</GameButton>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
