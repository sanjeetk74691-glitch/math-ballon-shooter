
import React from 'react';
import { Balloon, BalloonType } from '../../types';

interface BalloonComponentProps {
  balloon: Balloon;
}

const BalloonComponent: React.FC<BalloonComponentProps> = ({ balloon }) => {
  const isSpecial = balloon.type !== BalloonType.NORMAL;
  const isGolden = balloon.type === BalloonType.GOLDEN;
  
  let typeLabel = '';
  let specialStyle = '';

  switch (balloon.type) {
    case BalloonType.GOLDEN:
      typeLabel = '⭐';
      specialStyle = 'border-[4px] border-yellow-200 shadow-[0_0_50px_rgba(251,191,36,0.8)]';
      break;
    case BalloonType.BOMB:
      typeLabel = '💣';
      specialStyle = 'border-[4px] border-gray-900 animate-pulse';
      break;
    case BalloonType.FREEZE:
      typeLabel = '❄️';
      specialStyle = 'border-[4px] border-cyan-100 shadow-[0_0_40px_rgba(103,232,249,0.7)]';
      break;
    case BalloonType.STAR:
      typeLabel = '✨';
      specialStyle = 'border-[4px] border-pink-200 shadow-[0_0_40px_rgba(244,114,182,0.7)]';
      break;
  }

  const swayStyle = {
    animationDuration: `${2.5 + Math.random() * 1.5}s`,
    animationDelay: `${Math.random() * -3}s`
  };

  return (
    <div 
      className={`absolute transition-all duration-300 ${balloon.isPopping ? 'opacity-0 scale-[2.5] pointer-events-none' : 'opacity-100 scale-100'}`}
      style={{ 
        left: `${balloon.x}px`, 
        top: `${balloon.y}px`, 
        width: '100px', 
        height: '130px',
        zIndex: isSpecial ? 20 : 10,
      }}
    >
      <div className="w-full h-full animate-sway relative" style={swayStyle}>
        
        {/* Glow for special balloons */}
        {isSpecial && !balloon.isPopping && (
          <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-125 z-0" />
        )}

        {/* Realistic Balloon Body */}
        <div 
          className={`relative w-full h-full rounded-[50%_50%_50%_50%/60%_60%_40%_40%] flex items-center justify-center text-white font-game select-none shadow-[0_15px_35px_rgba(0,0,0,0.3)] overflow-hidden ${specialStyle}`}
          style={{ 
            background: balloon.type === BalloonType.BOMB 
              ? 'radial-gradient(circle at 30% 30%, #4b5563 0%, #111827 100%)' 
              : `radial-gradient(circle at 30% 30%, ${balloon.color} 0%, rgba(0,0,0,0.1) 100%)`,
            backgroundColor: balloon.color,
            boxShadow: `inset -10px -10px 20px rgba(0,0,0,0.15), inset 10px 10px 20px rgba(255,255,255,0.2)`
          }}
        >
          {/* Shimmer reflection */}
          <div className="shimmer-effect"></div>

          <div className="flex flex-col items-center pointer-events-none relative z-10">
            {typeLabel && <span className="text-2xl mb-1 filter drop-shadow-md">{typeLabel}</span>}
            <span className="text-3xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] text-center px-2 leading-none">
              {balloon.problem.question}
            </span>
          </div>

          {/* Realistic Gloss Highlight */}
          <div className="absolute top-[10%] left-[15%] w-[18px] h-[30px] bg-white/50 rounded-full rotate-[-40deg] blur-[1px]" />
          <div className="absolute top-[8%] left-[25%] w-[8px] h-[8px] bg-white/30 rounded-full blur-[0.5px]" />
          
          {/* Balloon Tie (Knot) */}
          <div 
            className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-6 h-6 rotate-45 rounded-sm"
            style={{ backgroundColor: balloon.type === BalloonType.BOMB ? '#111827' : balloon.color, filter: 'brightness(0.9)' }}
          />
        </div>

        {/* Realistic Wavy String */}
        <div className="absolute top-[100%] left-1/2 -translate-x-1/2 flex flex-col items-center animate-wavy-string">
          <div className="w-[1.5px] h-16 bg-white/40 shadow-sm" style={{ 
            backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)'
          }} />
        </div>
      </div>
    </div>
  );
};

export default BalloonComponent;
