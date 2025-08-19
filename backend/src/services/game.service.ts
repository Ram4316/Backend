import { Game, IGame } from '../models/Game';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { rollDice } from '../utils/dice';
import {
  initializePlayerTokens,
  calculateNewPosition,
  canMoveToken,
  getAvailableMoves,
  checkWinner,
  captureToken,
  isTokenFinished
} from '../utils/gameLogic';

export class GameService {
  static async createGame(
    userId: string,
    gameType: string,
    entryFee: number
  ): Promise<{ success: boolean; game?: IGame; message: string }> {
    try {
      // Check wallet balance
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < entryFee) {
        return {
          success: false,
          message: 'Insufficient wallet balance'
        };
      }

      // Determine max players and prize
      const maxPlayers = gameType.includes('2P') ? 2 : 4;
      const platformFee = entryFee * 0.1; // 10% platform fee
      const prize = (entryFee - platformFee) * maxPlayers;

      // Create game
      const game = await Game.create({
        gameType,
        entryFee,
        prize,
        maxPlayers,
        players: [{
          userId,
          position: 0,
          tokens: initializePlayerTokens(),
          isReady: false,
          joinedAt: new Date()
        }],
        status: 'WAITING'
      });

      // Deduct entry fee from wallet
      await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { balance: -entryFee, lockedAmount: entryFee } }
      );

      // Create transaction
      await Transaction.create({
        userId,
        type: 'GAME_ENTRY',
        amount: entryFee,
        status: 'COMPLETED',
        description: `Game entry fee - ${gameType}`,
        gameId: game._id
      });

      return {
        success: true,
        game,
        message: 'Game created successfully'
      };
    } catch (error) {
      console.error('Game creation failed:', error);
      return {
        success: false,
        message: 'Failed to create game'
      };
    }
  }

  static async joinGame(
    userId: string,
    roomId: string
  ): Promise<{ success: boolean; game?: IGame; message: string }> {
    try {
      const game = await Game.findOne({ roomId, status: 'WAITING' });

      if (!game) {
        return {
          success: false,
          message: 'Game not found or already started'
        };
      }

      // Check if already joined
      const alreadyJoined = game.players.some(p => p.userId.toString() === userId);
      if (alreadyJoined) {
        return {
          success: false,
          message: 'Already joined this game'
        };
      }

      // Check if game is full
      if (game.players.length >= game.maxPlayers) {
        return {
          success: false,
          message: 'Game is full'
        };
      }

      // Check wallet balance
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < game.entryFee) {
        return {
          success: false,
          message: 'Insufficient wallet balance'
        };
      }

      // Add player to game
      const playerPosition = game.players.length;
      game.players.push({
        userId: userId as any,
        position: playerPosition,
        tokens: initializePlayerTokens(),
        isReady: false,
        joinedAt: new Date()
      });

      await game.save();

      // Deduct entry fee
      await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { balance: -game.entryFee, lockedAmount: game.entryFee } }
      );

      // Create transaction
      await Transaction.create({
        userId,
        type: 'GAME_ENTRY',
        amount: game.entryFee,
        status: 'COMPLETED',
        description: `Game entry fee - ${game.gameType}`,
        gameId: game._id
      });

      return {
        success: true,
        game,
        message: 'Joined game successfully'
      };
    } catch (error) {
      console.error('Game joining failed:', error);
      return {
        success: false,
        message: 'Failed to join game'
      };
    }
  }

  static async startGame(roomId: string): Promise<{ success: boolean; message: string }> {
    try {
      const game = await Game.findOne({ roomId, status: 'WAITING' });

      if (!game) {
        return {
          success: false,
          message: 'Game not found'
        };
      }

      // Check if all players are ready
      const allReady = game.players.every(p => p.isReady);
      if (!allReady) {
        return {
          success: false,
          message: 'Not all players are ready'
        };
      }

      // Start game
      game.status = 'IN_PROGRESS';
      game.startedAt = new Date();
      game.currentTurn = 0;

      await game.save();

      return {
        success: true,
        message: 'Game started successfully'
      };
    } catch (error) {
      console.error('Game start failed:', error);
      return {
        success: false,
        message: 'Failed to start game'
      };
    }
  }

  static async makeMove(
    roomId: string,
    userId: string,
    tokenId: number
  ): Promise<{ success: boolean; game?: IGame; message: string; diceValue?: number }> {
    try {
      const game = await Game.findOne({ roomId, status: 'IN_PROGRESS' });

      if (!game) {
        return {
          success: false,
          message: 'Game not found or not in progress'
        };
      }

      // Find player
      const playerIndex = game.players.findIndex(p => p.userId.toString() === userId);
      if (playerIndex === -1) {
        return {
          success: false,
          message: 'Player not in this game'
        };
      }

      // Check if it's player's turn
      if (game.currentTurn !== playerIndex) {
        return {
          success: false,
          message: 'Not your turn'
        };
      }

      const player = game.players[playerIndex];
      const token = player.tokens[tokenId];

      if (!token) {
        return {
          success: false,
          message: 'Invalid token'
        };
      }

      // Roll dice
      const diceValue = rollDice();
      game.diceValue = diceValue;

      // Check if move is valid
      if (!canMoveToken(token, diceValue, player.position)) {
        // Pass turn to next player
        game.currentTurn = (game.currentTurn + 1) % game.players.length;
        await game.save();

        return {
          success: true,
          game,
          message: 'No valid moves available',
          diceValue
        };
      }

      // Calculate new position
      const oldPosition = token.position;
      const newPosition = calculateNewPosition(token, diceValue, player.position);

      // Update token position
      token.position = newPosition;

      // Check if entering safe zone
      if (newPosition >= 52) {
        token.isInSafeZone = true;
      }

      // Check if token finished
      if (isTokenFinished(token, player.position)) {
        token.isFinished = true;
      }

      // Check for captures
      const capturedPlayer = captureToken(game.players, player, newPosition);

      // Log move
      game.gameLog.push({
        action: 'MOVE',
        playerId: userId as any,
        data: {
          tokenId,
          from: oldPosition,
          to: newPosition,
          diceValue,
          captured: capturedPlayer ? true : false
        },
        timestamp: new Date()
      });

      game.lastMove = {
        playerId: userId as any,
        tokenId,
        from: oldPosition,
        to: newPosition,
        timestamp: new Date()
      };

      // Check for winner
      if (checkWinner(player)) {
        game.winner = userId as any;
        game.status = 'COMPLETED';
        game.completedAt = new Date();

        // Distribute prize
        await this.distributePrize(game);
      } else {
        // Next player's turn (unless got a 6 or captured)
        if (diceValue !== 6 && !capturedPlayer) {
          game.currentTurn = (game.currentTurn + 1) % game.players.length;
        }
      }

      await game.save();

      return {
        success: true,
        game,
        message: 'Move made successfully',
        diceValue
      };
    } catch (error) {
      console.error('Move failed:', error);
      return {
        success: false,
        message: 'Failed to make move'
      };
    }
  }

  static async distributePrize(game: IGame): Promise<void> {
    try {
      if (!game.winner) return;

      const winner = game.players.find(p => p.userId.toString() === game.winner?.toString());
      if (!winner) return;

      // Add prize to winner's wallet
      await Wallet.findOneAndUpdate(
        { userId: game.winner },
        { $inc: { balance: game.prize } }
      );

      // Create winning transaction
      await Transaction.create({
        userId: game.winner,
        type: 'GAME_WINNING',
        amount: game.prize,
        status: 'COMPLETED',
        description: `Game winning prize - ${game.gameType}`,
        gameId: game._id
      });

      // Unlock entry fees for all players
      for (const player of game.players) {
        await Wallet.findOneAndUpdate(
          { userId: player.userId },
          { $inc: { lockedAmount: -game.entryFee } }
        );
      }

      // Update winner's stats
      await User.findByIdAndUpdate(game.winner, {
        $inc: {
          'gameStats.totalGames': 1,
          'gameStats.gamesWon': 1,
          'gameStats.totalEarnings': game.prize
        }
      });

      // Update other players' stats
      for (const player of game.players) {
        if (player.userId.toString() !== game.winner?.toString()) {
          await User.findByIdAndUpdate(player.userId, {
            $inc: { 'gameStats.totalGames': 1 }
          });
        }
      }
    } catch (error) {
      console.error('Prize distribution failed:', error);
    }
  }

  static async getAvailableGames(gameType?: string): Promise<IGame[]> {
    const filter: any = { status: 'WAITING' };
    if (gameType) {
      filter.gameType = gameType;
    }

    return await Game.find(filter)
      .populate('players.userId', 'name phone gameStats')
      .sort({ createdAt: -1 })
      .limit(20);
  }

  static async getGameHistory(userId: string): Promise<IGame[]> {
    return await Game.find({
      'players.userId': userId,
      status: 'COMPLETED'
    })
      .populate('players.userId', 'name phone')
      .sort({ completedAt: -1 })
      .limit(50);
  }
}