
import React from 'react';
import { playSound } from '../../utils/soundManager.ts';

interface GameButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  className?: string;
  disabled?: boolean;
}

const GameButton: React.FC<GameButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  className = '',
  disabled = false
}) => {
  const baseStyles = "px-6 py-4 font-game text-xl sm:text-2xl rounded-3xl btn-3d transition-all transform flex items-center justify-center gap-2 select-none touch-manipulation overflow-hidden relative";
  
  const variants = {
    primary: "bg-blue-500 text-white border-blue-700 hover:bg-blue-400 active:bg-blue-600",
    secondary: "bg-yellow-400 text-white border-yellow-600 hover:bg-yellow-300 active:bg-yellow-500",
    danger: "bg-rose-500 text-white border-rose-700 hover:bg-rose-400 active:bg-rose-600",
    success: "bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-400 active:bg-emerald-600",
  };

  const handleClick = () => {
    if (!disabled) {
      playSound('click');
      onClick();
    }
  };

  return (
    <button 
      onClick={handleClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
    >
      <div className="absolute inset-0 glossy opacity-50 pointer-events-none" />
      <span className="relative z-10 drop-shadow-md">{children}</span>
    </button>
  );
};

export default GameButton;
