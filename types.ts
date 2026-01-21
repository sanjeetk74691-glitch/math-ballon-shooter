
export enum GameState {
  SPLASH = 'SPLASH',
  HOME = 'HOME',
  LEVEL_MAP = 'LEVEL_MAP',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER',
  FINAL_TROPHY = 'FINAL_TROPHY'
}

export enum BalloonType {
  NORMAL = 'NORMAL',
  GOLDEN = 'GOLDEN',
  BOMB = 'BOMB',
  FREEZE = 'FREEZE',
  STAR = 'STAR'
}

export interface MathProblem {
  question: string;
  answer: number;
}

export interface Balloon {
  id: string;
  x: number;
  y: number;
  type: BalloonType;
  problem: MathProblem;
  speed: number;
  color: string;
  isPopping: boolean;
}

export interface LevelConfig {
  id: number;
  title: string;
  minBalloons: number;
  maxBalloons: number;
  speed: number;
  operations: string[]; // ['+', '-', '*', '/']
  range: [number, number];
  timeLimit?: number; // In seconds
  description: string;
}

export interface UserStats {
  score: number;
  lives: number;
  combo: number;
  maxCombo: number;
  level: number;
  stars: number;
}
