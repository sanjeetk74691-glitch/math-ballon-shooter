
import { LevelConfig } from './types';

export const COLORS = [
  '#f87171', // red
  '#60a5fa', // blue
  '#4ade80', // green
  '#fbbf24', // yellow
  '#a78bfa', // purple
  '#f472b6', // pink
  '#2dd4bf', // teal
];

export const LEVELS: LevelConfig[] = [
  { id: 1, title: 'Day 1: Baby Steps', minBalloons: 3, maxBalloons: 5, speed: 0.25, operations: ['+'], range: [1, 5], description: 'Addition 1-5' },
  { id: 2, title: 'Day 2: Counting Up', minBalloons: 3, maxBalloons: 5, speed: 0.35, operations: ['+'], range: [1, 8], description: 'Addition 1-8' },
  { id: 3, title: 'Day 3: Growing Strong', minBalloons: 4, maxBalloons: 6, speed: 0.45, operations: ['+'], range: [1, 10], description: 'Addition 1-10' },
  { id: 4, title: 'Day 4: Double Digits', minBalloons: 5, maxBalloons: 7, speed: 0.55, operations: ['+'], range: [5, 15], description: 'Addition 5-15' },
  { id: 5, title: 'Day 5: More Addition', minBalloons: 5, maxBalloons: 7, speed: 0.65, operations: ['+'], range: [1, 20], description: 'Addition 1-20' },
  { id: 6, title: 'Day 6: Addition Master', minBalloons: 6, maxBalloons: 8, speed: 0.75, operations: ['+'], range: [10, 25], description: 'Addition 10-25' },
  { id: 7, title: 'Day 7: Subtracting Fun', minBalloons: 6, maxBalloons: 8, speed: 0.6, operations: ['-'], range: [1, 10], description: 'Subtraction 1-10' },
  { id: 8, title: 'Day 8: Downward Spiral', minBalloons: 6, maxBalloons: 8, speed: 0.7, operations: ['-'], range: [5, 15], description: 'Subtraction 5-15' },
  { id: 9, title: 'Day 9: Zero Hero', minBalloons: 7, maxBalloons: 9, speed: 0.8, operations: ['-'], range: [10, 20], description: 'Subtraction 10-20' },
  { id: 10, title: 'Day 10: Mixed Basics', minBalloons: 8, maxBalloons: 10, speed: 0.9, operations: ['+', '-'], range: [1, 15], description: 'Add + Sub 1-15' },
  { id: 11, title: 'Day 11: Speed Mix', minBalloons: 8, maxBalloons: 10, speed: 1.0, operations: ['+', '-'], range: [5, 20], description: 'Add + Sub 5-20' },
  { id: 12, title: 'Day 12: Rapid Fire', minBalloons: 9, maxBalloons: 11, speed: 1.1, operations: ['+', '-'], range: [1, 25], description: 'Add + Sub 1-25' },
  { id: 13, title: 'Day 13: Times Tables', minBalloons: 10, maxBalloons: 12, speed: 0.8, operations: ['*'], range: [1, 5], description: 'Multiplication 1-5' },
  { id: 14, title: 'Day 14: Multiplication Fun', minBalloons: 10, maxBalloons: 12, speed: 0.9, operations: ['*'], range: [1, 10], description: 'Multiplication 1-10' },
  { id: 15, title: 'Day 15: Fast Times', minBalloons: 10, maxBalloons: 12, speed: 1.1, operations: ['*'], range: [2, 12], description: 'Multiplication 2-12' },
  { id: 16, title: 'Day 16: The Big Three', minBalloons: 11, maxBalloons: 13, speed: 1.2, operations: ['+', '-', '*'], range: [1, 12], description: 'Mixed Ops 1-12' },
  { id: 17, title: 'Day 17: Whirlwind', minBalloons: 12, maxBalloons: 14, speed: 1.3, operations: ['+', '-', '*'], range: [5, 15], description: 'Mixed Ops 5-15' },
  { id: 18, title: 'Day 18: Lightning Mix', minBalloons: 13, maxBalloons: 15, speed: 1.4, operations: ['+', '-', '*'], range: [1, 20], description: 'Mixed Ops 1-20' },
  { id: 19, title: 'Day 19: The Hard Grind', minBalloons: 14, maxBalloons: 16, speed: 1.6, operations: ['+', '-', '*'], range: [5, 30], description: 'Hard Mixed Math' },
  { id: 20, title: 'Day 20: BOSS BATTLE', minBalloons: 15, maxBalloons: 20, speed: 1.8, operations: ['+', '-', '*'], range: [1, 50], timeLimit: 60, description: 'Ultimate Boss Level!' },
];
