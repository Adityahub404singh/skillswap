// src/lib/confetti.ts
import confetti from 'canvas-confetti';

export const triggerMatchConfetti = () => {
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#818cf8', '#ffffff'] // SkillSwap ke colors
  });
};
