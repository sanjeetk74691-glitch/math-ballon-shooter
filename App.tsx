
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, UserStats, LevelConfig, Balloon, BalloonType } from './types.ts';
import { LEVELS, COLORS } from './constants.ts';
import { generateProblem } from './utils/mathHelper.ts';
import { playSound, setMuted, getMuted } from './utils/soundManager.ts';
import GameButton from './components/ui/GameButton.tsx';
import BalloonComponent from './components/game/BalloonComponent.tsx';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.SPLASH);
  const [stats, setStats] = useState<UserStats>({
    score: 0,
    lives: 3,
    combo: 0,
    maxCombo: 0,
    level: 1,
    stars: 0
  });
  
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [currentLevelConfig, setCurrentLevelConfig] = useState<LevelConfig>(LEVELS[0]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [isFrozen, setIsFrozen] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | 'about' | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(getMuted());

  const gameLoopRef = useRef<number>(null);
  const lastSpawnRef = useRef<number>(0);
  const skyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState === GameState.LEVEL_COMPLETE) playSound('win');
    if (gameState === GameState.GAME_OVER) playSound('lose');
    if (gameState === GameState.FINAL_TROPHY) playSound('win');
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.SPLASH) {
      const timer = setTimeout(() => setGameState(GameState.HOME), 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === GameState.PLAYING) {
      checkLevelEnd();
    }
  }, [gameState, timeLeft]);

  const updateOptionsList = useCallback((currentBalloons: Balloon[]) => {
    const activeAnswers = Array.from(new Set(currentBalloons
      .filter(b => !b.isPopping && b.type !== BalloonType.BOMB)
      .map(b => b.problem.answer)
    ));

    setOptions(prev => {
      const missing = activeAnswers.filter(ans => !prev.includes(ans));
      if (missing.length === 0 && prev.length >= 6) return prev;

      const combined = new Set([...activeAnswers]);
      prev.forEach(p => { if (combined.size < 6) combined.add(p); });

      let safety = 0;
      const maxVal = currentLevelConfig.range[1] * 2 + 5;
      while (combined.size < 6 && safety < 100) {
        const rand = Math.floor(Math.random() * maxVal);
        combined.add(rand);
        safety++;
      }

      return Array.from(combined).sort((a, b) => a - b);
    });
  }, [currentLevelConfig.range]);

  const startLevel = (levelId: number) => {
    const config = LEVELS.find(l => l.id === levelId) || LEVELS[0];
    setCurrentLevelConfig(config);
    setStats(prev => ({ ...prev, lives: 3, score: 0, combo: 0 }));
    setBalloons([]);
    setOptions([]);
    setTimeLeft(config.timeLimit || null);
    setGameState(GameState.PLAYING);
    setMultiplier(1);
    setIsFrozen(false);
    playSound('click');
  };

  const spawnBalloon = useCallback(() => {
    if (!skyRef.current) return;
    const { width } = skyRef.current.getBoundingClientRect();
    const typeRoll = Math.random();
    let type = BalloonType.NORMAL;
    if (typeRoll > 0.96) type = BalloonType.GOLDEN;
    else if (typeRoll > 0.92) type = BalloonType.BOMB;
    else if (typeRoll > 0.88) type = BalloonType.FREEZE;
    else if (typeRoll > 0.84) type = BalloonType.STAR;

    const problem = generateProblem(currentLevelConfig.operations, currentLevelConfig.range);
    
    const newBalloon: Balloon = {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * (width - 90) + 10,
      y: -150,
      type,
      problem,
      speed: currentLevelConfig.speed + Math.random() * 0.1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      isPopping: false
    };

    setBalloons(prev => {
      const next = [...prev, newBalloon];
      updateOptionsList(next);
      return next;
    });
  }, [currentLevelConfig, updateOptionsList]);

  const updateGame = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const now = Date.now();
    if (now - lastSpawnRef.current > (800 / currentLevelConfig.speed)) {
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
        }
      }

      return updated.filter(b => b.y < (skyRef.current?.clientHeight || 800));
    });

    gameLoopRef.current = requestAnimationFrame(updateGame);
  }, [gameState, balloons.length, currentLevelConfig, spawnBalloon, isFrozen]);

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

  const handleAnswer = (answer: number) => {
    const correctBalloons = balloons.filter(b => b.problem.answer === answer && !b.isPopping);

    if (correctBalloons.length > 0) {
      playSound('correct');
      const target = correctBalloons[0];
      popBalloon(target);
    } else {
      playSound('wrong');
      setStats(s => ({ ...s, lives: Math.max(0, s.lives - 1), combo: 0 }));
    }
  };

  const popBalloon = (balloon: Balloon) => {
    if (balloon.isPopping) return;
    setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, isPopping: true } : b));
    playSound('pop');
    let scoreGain = 10 * multiplier;
    let comboGain = 1;
    switch (balloon.type) {
      case BalloonType.GOLDEN: scoreGain += 50; break;
      case BalloonType.BOMB: 
        playSound('wrong');
        setStats(s => ({ ...s, lives: Math.max(0, s.lives - 1), combo: 0 }));
        return;
      case BalloonType.FREEZE: 
        setIsFrozen(true);
        setTimeout(() => setIsFrozen(false), 5000);
        break;
      case BalloonType.STAR:
        setMultiplier(2);
        setTimeout(() => setMultiplier(1), 8000);
        break;
    }
    setStats(s => ({
      ...s,
      score: s.score + scoreGain + (s.combo * 2),
      combo: s.combo + comboGain,
      maxCombo: Math.max(s.maxCombo, s.combo + comboGain)
    }));
    setTimeout(() => {
      setBalloons(prev => prev.filter(b => b.id !== balloon.id));
      if (currentLevelConfig.id < 20 && stats.score + scoreGain >= 200) {
        checkLevelEnd();
      }
    }, 300);
  };

  const checkLevelEnd = () => {
    if (currentLevelConfig.id === 20) {
      setGameState(GameState.FINAL_TROPHY);
    } else {
      setGameState(GameState.LEVEL_COMPLETE);
    }
  };

  const toggleMute = () => {
    const newVal = !isAudioMuted;
    setIsAudioMuted(newVal);
    setMuted(newVal);
    playSound('click');
  };

  const openModal = (view: 'privacy' | 'terms' | 'about' | null) => {
    playSound('click');
    setLegalView(view);
  };

  const closeModal = () => {
    playSound('click');
    setLegalView(null);
  };

  const LegalContent = {
    privacy: {
      title: "Privacy Policy",
      body: "We are committed to providing a safe environment for children. Math Balloon Shooter does not collect, store, or share any personal information. No data is transmitted to third parties. This game is designed to be fully compliant with COPPA and Google Play's Family policies."
    },
    terms: {
      title: "Terms of Service",
      body: "Math Balloon Shooter is provided 'as is' for educational purposes. By using this application, you agree to use it respectfully. We do not guarantee uninterrupted access but strive to maintain a high-quality educational experience for all children."
    },
    about: {
      title: "About Math Master",
      body: "Developed with love for learning. Our mission is to make math fun and accessible through gamification. This project combines classic arcade mechanics with curriculum-based arithmetic challenges. Version 1.0.2 - Designed for Global Learners."
    }
  };

  // --- RENDERING SCREENS ---

  if (gameState === GameState.SPLASH) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-indigo-700 flex flex-col items-center justify-center text-white p-6 text-center z-[500]">
        <div className="w-40 h-40 mb-8 bg-white/20 rounded-full flex items-center justify-center animate-bounce shadow-2xl">
          <span className="text-8xl">🎈</span>
        </div>
        <h1 className="text-5xl font-game mb-4 tracking-wider drop-shadow-xl">MATH BALLOON</h1>
        <h2 className="text-2xl font-game text-yellow-300 drop-shadow-lg uppercase tracking-[0.3em]">Adventure</h2>
        <div className="mt-12 w-48 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-400 animate-loading w-full" style={{ width: '80%' }}></div>
        </div>
      </div>
    );
  }

  if (gameState === GameState.HOME) {
    return (
      <div className="fixed inset-0 bg-sky-100 flex flex-col items-center justify-around p-8 bg-[url('https://picsum.photos/id/10/800/1200')] bg-cover bg-center">
        <div className="absolute inset-0 bg-blue-600/30 backdrop-blur-[1px]"></div>
        
        <div className="relative z-10 text-center">
          <div className="inline-block animate-float">
             <span className="text-9xl mb-4 block drop-shadow-2xl">🎈</span>
          </div>
          <h1 className="text-7xl font-game text-white drop-shadow-[0_8px_0_#2563eb] mb-2 leading-tight">MATH<br/>BALLOON</h1>
          <h2 className="text-4xl font-game text-yellow-400 drop-shadow-[0_4px_0_#d97706] -rotate-2">PRO MASTER</h2>
        </div>
        
        <div className="relative z-10 flex flex-col gap-5 w-full max-w-xs">
          <GameButton onClick={() => { playSound('click'); setGameState(GameState.LEVEL_MAP); }} variant="secondary" className="py-7 text-3xl shadow-[0_10px_0_0_#d97706] rounded-3xl">
            🚀 PLAY NOW
          </GameButton>
          <div className="grid grid-cols-2 gap-4">
             <GameButton onClick={() => { playSound('click'); }} variant="primary" className="py-4 text-lg">🏆 BEST</GameButton>
             <GameButton onClick={() => { playSound('click'); setShowSettings(true); }} variant="primary" className="py-4 text-lg">⚙️ SETTINGS</GameButton>
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
            <div className="relative bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl border-t-8 border-blue-400">
              <div className="p-8 text-center">
                <h3 className="text-3xl font-game text-blue-600 mb-8 uppercase tracking-widest">Settings</h3>
                <div className="flex flex-col gap-6 mb-8">
                  <div className="flex items-center justify-between bg-blue-50 p-5 rounded-3xl">
                    <span className="font-bold text-blue-800 text-xl flex items-center gap-3">
                      {isAudioMuted ? '🔇' : '🔊'} SOUNDS
                    </span>
                    <button onClick={toggleMute} className={`w-16 h-8 rounded-full transition-colors relative ${isAudioMuted ? 'bg-gray-300' : 'bg-green-400'}`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isAudioMuted ? 'left-1' : 'left-9'}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => openModal('privacy')} className="text-blue-500 font-bold hover:underline py-2">Privacy Policy</button>
                    <button onClick={() => openModal('terms')} className="text-blue-500 font-bold hover:underline py-2">Terms of Service</button>
                    <button onClick={() => openModal('about')} className="text-blue-500 font-bold hover:underline py-2">About App</button>
                  </div>
                </div>
                <GameButton onClick={() => { playSound('click'); setShowSettings(false); }} variant="secondary" className="w-full">CLOSE</GameButton>
              </div>
            </div>
          </div>
        )}

        {legalView && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={closeModal} />
            <div className="relative bg-white rounded-[40px] w-full max-w-sm h-[80vh] flex flex-col shadow-2xl overflow-hidden border-t-8 border-yellow-400">
              <div className="p-8 flex-1 overflow-y-auto text-left">
                <h3 className="text-2xl font-game text-yellow-600 mb-6 uppercase">{LegalContent[legalView].title}</h3>
                <p className="text-gray-600 leading-relaxed font-bold whitespace-pre-wrap">{LegalContent[legalView].body}</p>
                <div className="h-8" />
              </div>
              <div className="p-6 bg-gray-50 border-t">
                <GameButton onClick={closeModal} variant="primary" className="w-full">GOT IT</GameButton>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 text-white font-black opacity-60 text-xs tracking-[0.3em] pb-4 uppercase">
          Safe for Kids • No Data Tracking
        </div>
      </div>
    );
  }

  if (gameState === GameState.LEVEL_MAP) {
    return (
      <div className="fixed inset-0 bg-blue-50 overflow-y-auto p-4 flex flex-col items-center z-[400]">
        <div className="flex justify-between w-full max-w-md items-center mb-6 sticky top-0 bg-blue-50/90 backdrop-blur py-4 z-20 px-2 rounded-b-3xl">
          <button onClick={() => { playSound('click'); setGameState(GameState.HOME); }} className="bg-white p-3 rounded-2xl shadow-md text-2xl active:scale-90 transition-transform">🏠</button>
          <h2 className="text-3xl font-game text-blue-600 tracking-tight">LEVEL MAP</h2>
          <div className="bg-white px-4 py-2 rounded-2xl shadow-md flex items-center gap-1">
             <span className="text-yellow-400">⭐</span>
             <span className="font-game text-blue-600">{stats.stars}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 w-full max-w-md pb-24 px-2">
          {LEVELS.map((lvl) => (
            <div key={lvl.id} className="flex flex-col items-center">
              <button 
                onClick={() => startLevel(lvl.id)}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-game text-xl flex items-center justify-center shadow-lg transform active:scale-95 transition-all
                  ${lvl.id <= stats.level ? 'bg-yellow-400 text-white border-b-4 border-yellow-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                `}
                disabled={lvl.id > stats.level}
              >
                {lvl.id}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === GameState.PLAYING || gameState === GameState.PAUSED) {
    return (
      <div className="fixed inset-0 bg-sky-200 flex flex-col select-none touch-none overflow-hidden h-screen">
        <div className="bg-white/95 p-3 shadow-md flex justify-between items-center z-50 border-b-2 border-blue-100 h-16">
          <div className="flex gap-3 items-center">
            <button onClick={() => { playSound('click'); setGameState(GameState.PAUSED); }} className="text-2xl bg-gray-100 p-2 rounded-xl active:scale-90 transition-transform">⏸️</button>
            <div className="leading-tight">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Level {currentLevelConfig.id}</p>
              <p className="text-lg font-game text-blue-600">{stats.score}</p>
            </div>
          </div>
          <div className="text-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
            {stats.combo > 1 && (
              <div className="animate-bounce">
                <p className="text-[10px] font-bold text-pink-500 uppercase leading-none">Combo!</p>
                <p className="text-lg font-game text-pink-500 leading-none">x{stats.combo}</p>
              </div>
            )}
          </div>
          <div className="flex gap-1 bg-red-50 px-2 py-1 rounded-full border border-red-100">
            {[...Array(3)].map((_, i) => (
              <span key={i} className={`text-xl transition-all duration-500 ${i < stats.lives ? 'opacity-100 scale-100 drop-shadow' : 'opacity-20 scale-75 grayscale'}`}>❤️</span>
            ))}
          </div>
        </div>
        <div ref={skyRef} className={`flex-1 relative overflow-hidden transition-all duration-700 ${isFrozen ? 'bg-blue-300/60 brightness-110' : 'bg-transparent'}`}>
          {balloons.map(balloon => (
            <BalloonComponent key={balloon.id} balloon={balloon} />
          ))}
          {isFrozen && <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-9xl opacity-20 animate-pulse">❄️</div>}
        </div>
        
        {/* Answer Selection - Fixed height and padding to prevent clipping */}
        <div className="bg-white/95 p-4 pb-12 border-t-8 border-blue-200 grid grid-cols-3 gap-3 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          {options.map(ans => (
            <button 
              key={ans} 
              onClick={() => handleAnswer(ans)} 
              className="py-5 bg-blue-500 text-white font-game text-3xl rounded-3xl border-b-[6px] border-blue-700 shadow-lg active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center"
            >
              {ans}
            </button>
          ))}
        </div>

        {gameState === GameState.PAUSED && (
          <div className="absolute inset-0 z-[100] bg-blue-900/40 backdrop-blur-md flex items-center justify-center p-8">
            <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-xs text-center border-t-8 border-blue-400">
              <h2 className="text-4xl font-game text-blue-600 mb-8 uppercase tracking-widest">Paused</h2>
              <div className="flex flex-col gap-4">
                <GameButton onClick={() => { playSound('click'); setGameState(GameState.PLAYING); }} variant="success">RESUME</GameButton>
                <GameButton onClick={() => { playSound('click'); setGameState(GameState.LEVEL_MAP); }} variant="primary">LEVELS</GameButton>
                <GameButton onClick={() => { playSound('click'); setGameState(GameState.HOME); }} variant="danger">QUIT</GameButton>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === GameState.LEVEL_COMPLETE) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-500 to-emerald-600 flex flex-col items-center justify-center p-8 text-white z-[200]">
        <span className="text-9xl mb-8 animate-bounce drop-shadow-2xl">🌟</span>
        <h2 className="text-5xl font-game mb-2 text-center">AWESOME!</h2>
        <div className="bg-white/20 p-8 rounded-[40px] w-full max-w-xs mb-12 shadow-xl border border-white/20">
          <div className="flex justify-between mb-2"><span className="font-bold">SCORE</span><span className="font-game">{stats.score}</span></div>
          <div className="flex justify-between"><span className="font-bold">COMBO</span><span className="font-game">x{stats.maxCombo}</span></div>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <GameButton onClick={() => { setStats(s => ({ ...s, level: Math.max(s.level, currentLevelConfig.id + 1), stars: s.stars + 3 })); startLevel(currentLevelConfig.id + 1); }} variant="secondary" className="py-5 text-2xl">NEXT DAY ➡️</GameButton>
          <GameButton onClick={() => { playSound('click'); setGameState(GameState.LEVEL_MAP); }} variant="primary">MAP</GameButton>
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-500 to-rose-700 flex flex-col items-center justify-center p-8 text-white z-[200]">
        <span className="text-9xl mb-8 opacity-50 grayscale drop-shadow-2xl relative">🎈<span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grayscale-0 opacity-100">💥</span></span>
        <h2 className="text-5xl font-game mb-10 text-center">UH OH!</h2>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <GameButton onClick={() => startLevel(currentLevelConfig.id)} variant="secondary" className="py-5 text-2xl">TRY AGAIN 🔄</GameButton>
          <GameButton onClick={() => { playSound('click'); setGameState(GameState.HOME); }} variant="danger">QUIT</GameButton>
        </div>
      </div>
    );
  }

  if (gameState === GameState.FINAL_TROPHY) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-yellow-300 to-orange-500 flex flex-col items-center justify-center p-8 text-white z-[300]">
        <span className="text-[10rem] mb-12 animate-float drop-shadow-2xl">🏆</span>
        <h2 className="text-5xl font-game text-center mb-12">MATH LEGEND!</h2>
        <GameButton onClick={() => { playSound('click'); setGameState(GameState.HOME); }} variant="secondary" className="w-full max-w-xs py-7 text-3xl">TITLE SCREEN</GameButton>
      </div>
    );
  }

  return null;
};

export default App;
