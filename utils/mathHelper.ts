
import { MathProblem } from '../types';

export const generateProblem = (operations: string[], range: [number, number]): MathProblem => {
  const op = operations[Math.floor(Math.random() * operations.length)];
  let num1 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  let num2 = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

  let question = '';
  let answer = 0;

  switch (op) {
    case '+':
      answer = num1 + num2;
      question = `${num1} + ${num2}`;
      break;
    case '-':
      // Ensure positive results for kids
      if (num1 < num2) [num1, num2] = [num2, num1];
      answer = num1 - num2;
      question = `${num1} - ${num2}`;
      break;
    case '*':
      // Limit range for multiplication slightly for fairness
      const multLimit = Math.min(range[1], 12);
      num1 = Math.floor(Math.random() * multLimit) + 1;
      num2 = Math.floor(Math.random() * multLimit) + 1;
      answer = num1 * num2;
      question = `${num1} × ${num2}`;
      break;
    case '/':
      // Ensure integer results
      num2 = Math.floor(Math.random() * Math.min(range[1], 10)) + 1;
      answer = Math.floor(Math.random() * 10) + 1;
      num1 = answer * num2;
      question = `${num1} ÷ ${num2}`;
      break;
  }

  return { question, answer };
};
