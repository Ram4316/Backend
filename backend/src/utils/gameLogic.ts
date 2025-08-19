/**
 * Ludo game logic utilities
 */

export interface Token {
  id: number;
  position: number; // -1 for home, 0-51 for board, 52-55 for safe zone
  isInSafeZone: boolean;
  isFinished: boolean;
}

export interface Player {
  userId: string;
  position: number; // 0-3 board positions (Red, Blue, Yellow, Green)
  tokens: Token[];
  isReady: boolean;
}

// Starting positions for each player
export const STARTING_POSITIONS = {
  0: 1,   // Red starts at position 1
  1: 14,  // Blue starts at position 14
  2: 27,  // Yellow starts at position 27
  3: 40   // Green starts at position 40
};

// Safe zones start positions
export const SAFE_ZONE_START = {
  0: 52,  // Red safe zone: 52-55
  1: 56,  // Blue safe zone: 56-59
  2: 60,  // Yellow safe zone: 60-63
  3: 64   // Green safe zone: 64-67
};

export const canMoveToken = (token: Token, diceValue: number, playerPosition: number): boolean => {
  // Token is at home and dice shows 6
  if (token.position === -1) {
    return diceValue === 6;
  }

  // Token is finished
  if (token.isFinished) {
    return false;
  }

  // Token is in safe zone
  if (token.isInSafeZone) {
    const safeZoneEnd = SAFE_ZONE_START[playerPosition as keyof typeof SAFE_ZONE_START] + 3;
    return token.position + diceValue <= safeZoneEnd;
  }

  return true;
};

export const calculateNewPosition = (token: Token, diceValue: number, playerPosition: number): number => {
  // Moving from home
  if (token.position === -1) {
    return STARTING_POSITIONS[playerPosition as keyof typeof STARTING_POSITIONS];
  }

  // Already in safe zone
  if (token.isInSafeZone) {
    return token.position + diceValue;
  }

  let newPosition = token.position + diceValue;

  // Check if entering safe zone
  const playerStartPos = STARTING_POSITIONS[playerPosition as keyof typeof STARTING_POSITIONS];
  const safeZoneEntry = (playerStartPos + 50) % 52;

  if (token.position < safeZoneEntry && newPosition >= safeZoneEntry) {
    // Entering safe zone
    const overshoot = newPosition - safeZoneEntry;
    return SAFE_ZONE_START[playerPosition as keyof typeof SAFE_ZONE_START] + overshoot;
  }

  // Normal board movement
  return newPosition % 52;
};

export const isTokenFinished = (token: Token, playerPosition: number): boolean => {
  const safeZoneEnd = SAFE_ZONE_START[playerPosition as keyof typeof SAFE_ZONE_START] + 3;
  return token.position === safeZoneEnd;
};

export const getAvailableMoves = (player: Player, diceValue: number): number[] => {
  const availableTokens: number[] = [];

  player.tokens.forEach((token, index) => {
    if (canMoveToken(token, diceValue, player.position)) {
      availableTokens.push(index);
    }
  });

  return availableTokens;
};

export const checkWinner = (player: Player): boolean => {
  return player.tokens.every(token => token.isFinished);
};

export const captureToken = (boardState: Player[], movingPlayer: Player, newPosition: number): Player | null => {
  // Check if any opponent token is captured
  for (const player of boardState) {
    if (player.userId === movingPlayer.userId) continue;

    for (let i = 0; i < player.tokens.length; i++) {
      const token = player.tokens[i];
      if (token.position === newPosition && !token.isInSafeZone && !token.isFinished) {
        // Capture the token - send it home
        token.position = -1;
        return player;
      }
    }
  }

  return null;
};

// Initialize player tokens
export const initializePlayerTokens = (): Token[] => {
  return Array.from({ length: 4 }, (_, index) => ({
    id: index,
    position: -1, // Start at home
    isInSafeZone: false,
    isFinished: false
  }));
};