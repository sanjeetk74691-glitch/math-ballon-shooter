
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
  const baseStyles = "px-6 py-3 font-game text-lg sm:text-xl rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all transform flex items-center justify-center gap-2 select-none touch-manipulation";
  
  const variants = {
    primary: "bg-blue-400 text-white border-b-4 border-blue-600 active:bg-blue-500",
    secondary: "bg-yellow-400 text-white border-b-4 border-yellow-600 active:bg-yellow-500",
    danger: "bg-red-500 text-white border-b-4 border-red-700 active:bg-red-600",
    success: "bg-green-500 text-white border-b-4 border-green-700 active:bg-green-600",
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
      className={`${baseStyles} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

export default GameButton;
