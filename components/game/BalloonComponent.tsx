
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
      specialStyle = 'border-[6px] border-yellow-300 shadow-[0_0_40px_rgba(251,191,36,1)]';
      break;
    case BalloonType.BOMB:
      typeLabel = '💣';
      specialStyle = 'border-[6px] border-black animate-pulse bg-gray-800';
      break;
    case BalloonType.FREEZE:
      typeLabel = '❄️';
      specialStyle = 'border-[6px] border-blue-200 shadow-[0_0_35px_rgba(191,219,254,0.9)]';
      break;
    case BalloonType.STAR:
      typeLabel = '✨';
      specialStyle = 'border-[6px] border-pink-300 shadow-[0_0_35px_rgba(244,114,182,0.9)]';
      break;
  }

  // Each balloon gets a slightly different animation speed/delay to feel unique
  const swayStyle = {
    animationDuration: `${2 + Math.random() * 2}s`,
    animationDelay: `${Math.random() * -2}s`
  };

  const bobStyle = {
    animationDuration: `${3 + Math.random() * 2}s`,
    animationDelay: `${Math.random() * -3}s`
  };

  return (
    <div 
      className={`absolute transition-all duration-300 ${balloon.isPopping ? 'opacity-0 scale-[3] pointer-events-none' : 'opacity-100 scale-100'}`}
      style={{ 
        left: `${balloon.x}px`, 
        top: `${balloon.y}px`, 
        width: '95px', 
        height: '120px',
        zIndex: isSpecial ? 20 : 10,
        ...bobStyle
      }}
    >
      <div className="w-full h-full animate-sway relative" style={swayStyle}>
        
        {/* Magic Sparkle Effect for Golden Balloons */}
        {isGolden && !balloon.isPopping && (
          <>
            <div className="absolute inset-[-20px] bg-gradient-to-r from-yellow-300/0 via-yellow-400/30 to-yellow-300/0 rounded-full animate-gold-rotate pointer-events-none z-0" />
            <div className="absolute top-0 left-0 w-6 h-6 text-yellow-200 text-xl animate-star-twinkle pointer-events-none z-20" style={{ animationDelay: '0.2s' }}>✦</div>
            <div className="absolute top-1/2 right-[-10px] w-6 h-6 text-yellow-100 text-lg animate-star-twinkle pointer-events-none z-20" style={{ animationDelay: '0.8s' }}>✧</div>
            <div className="absolute bottom-2 left-2 w-6 h-6 text-white text-xl animate-star-twinkle pointer-events-none z-20" style={{ animationDelay: '0.5s' }}>✦</div>
          </>
        )}

        {/* Balloon Shape */}
        <div 
          className={`relative w-full h-full rounded-[50%_50%_50%_50%/60%_60%_40%_40%] flex items-center justify-center text-white font-game select-none shadow-2xl overflow-hidden ${specialStyle}`}
          style={{ backgroundColor: balloon.type === BalloonType.BOMB ? '#1f2937' : balloon.color }}
        >
          {/* Iridescent Shimmer Overlay */}
          <div className="shimmer-effect"></div>

          <div className="flex flex-col items-center pointer-events-none relative z-10">
            {typeLabel && <span className={`text-2xl mb-1 filter drop-shadow-md ${isGolden ? 'animate-bounce' : ''}`}>{typeLabel}</span>}
            <span className="text-3xl font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] text-center px-2 leading-tight">
              {balloon.problem.question}
            </span>
          </div>

          {/* Fixed Glossy Highlight */}
          <div className="absolute top-[8%] left-[12%] w-[20px] h-[35px] bg-white/40 rounded-full rotate-[-40deg] blur-[1px]" />
          
          {/* Knot at the bottom */}
          <div 
            className="absolute bottom-[-7px] left-1/2 -translate-x-1/2 w-5 h-5 rotate-45"
            style={{ backgroundColor: balloon.type === BalloonType.BOMB ? '#1f2937' : balloon.color }}
          />
          
          {/* String */}
          <div className="absolute top-[100%] left-1/2 w-[2px] h-14 bg-white/30 -translate-x-1/2 shadow-sm" />
        </div>
      </div>
    </div>
  );
};

export default BalloonComponent;
