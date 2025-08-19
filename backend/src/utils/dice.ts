/**
 * Fair dice rolling system - server-side only
 * Never let frontend roll dice to prevent cheating
 */

export const rollDice = (): number => {
  // Generate cryptographically secure random number
  const randomBuffer = require('crypto').randomBytes(4);
  const randomValue = randomBuffer.readUInt32BE(0);
  
  // Convert to 1-6 range
  return (randomValue % 6) + 1;
};

export const rollMultipleDice = (count: number): number[] => {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDice());
  }
  return rolls;
};

// Get probability distribution for testing fairness
export const getDiceProbability = (rolls: number[]): { [key: number]: number } => {
  const frequency: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  
  rolls.forEach(roll => {
    frequency[roll]++;
  });
  
  const total = rolls.length;
  const probability: { [key: number]: number } = {};
  
  for (let i = 1; i <= 6; i++) {
    probability[i] = (frequency[i] / total) * 100;
  }
  
  return probability;
};