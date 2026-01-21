
import React from 'react';
import { Balloon, BalloonType } from '../../types';

interface BalloonComponentProps {
  balloon: Balloon;
  // onSelect is no longer used for clicking the balloon directly
}

const BalloonComponent: React.FC<BalloonComponentProps> = ({ balloon }) => {
  const isSpecial = balloon.type !== BalloonType.NORMAL;
  
  let typeLabel = '';
  let specialStyle = '';

  switch (balloon.type) {
    case BalloonType.GOLDEN:
      typeLabel = '⭐';
      specialStyle = 'border-4 border-yellow-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]';
      break;
    case BalloonType.BOMB:
      typeLabel = '💣';
      specialStyle = 'border-4 border-black animate-pulse';
      break;
    case BalloonType.FREEZE:
      typeLabel = '❄️';
      specialStyle = 'border-4 border-blue-200 shadow-[0_0_15px_rgba(191,219,254,0.6)]';
      break;
    case BalloonType.STAR:
      typeLabel = '✨';
      specialStyle = 'border-4 border-pink-300';
      break;
  }

  return (
    <div 
      className={`absolute transition-opacity duration-300 ${balloon.isPopping ? 'opacity-0 scale-150 pointer-events-none' : 'opacity-100 scale-100'}`}
      style={{ 
        left: `${balloon.x}px`, 
        top: `${balloon.y}px`, 
        width: '80px', 
        height: '100px',
        zIndex: isSpecial ? 20 : 10
      }}
    >
      {/* Balloon Shape */}
      <div 
        className={`relative w-full h-full rounded-[50%_50%_50%_50%/60%_60%_40%_40%] flex items-center justify-center text-white font-game text-lg select-none ${specialStyle}`}
        style={{ backgroundColor: balloon.type === BalloonType.BOMB ? '#374151' : balloon.color }}
      >
        <div className="flex flex-col items-center">
          {typeLabel && <span className="text-xl mb-1">{typeLabel}</span>}
          <span className="drop-shadow-md text-center px-1 leading-tight">
            {balloon.problem.question}
          </span>
        </div>

        {/* Highlight/Reflect */}
        <div className="absolute top-[10%] left-[15%] w-[15px] h-[25px] bg-white/30 rounded-full rotate-[-45deg]" />
        
        {/* Knot at the bottom */}
        <div 
          className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
          style={{ backgroundColor: balloon.type === BalloonType.BOMB ? '#374151' : balloon.color }}
        />
        
        {/* String */}
        <div className="absolute top-[100%] left-1/2 w-[2px] h-10 bg-gray-400 opacity-50 -translate-x-1/2" />
      </div>
    </div>
  );
};

export default BalloonComponent;
