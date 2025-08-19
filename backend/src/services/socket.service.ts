import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { GameService } from './game.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  roomId?: string;
}

export const socketHandler = (io: Server) => {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('Authentication error');
      }

      const decoded = verifyToken(token);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🔌 User ${socket.userId} connected`);

    // Join game room
    socket.on('join-room', (roomId: string) => {
      socket.join(roomId);
      socket.roomId = roomId;
      console.log(`User ${socket.userId} joined room ${roomId}`);
    });

    // Player ready
    socket.on('player-ready', async (data: { roomId: string }) => {
      try {
        const game = await GameService.updatePlayerReady(data.roomId, socket.userId!);
        if (game.success) {
          io.to(data.roomId).emit('player-ready-update', {
            gameId: data.roomId,
            players: game.game?.players
          });

          // Check if all players are ready to start
          const allReady = game.game?.players.every(p => p.isReady);
          if (allReady && game.game?.players.length === game.game?.maxPlayers) {
            const startResult = await GameService.startGame(data.roomId);
            if (startResult.success) {
              io.to(data.roomId).emit('game-started', {
                gameId: data.roomId,
                currentTurn: 0
              });
            }
          }
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to update ready status' });
      }
    });

    // Make move
    socket.on('make-move', async (data: { roomId: string; tokenId: number }) => {
      try {
        const result = await GameService.makeMove(data.roomId, socket.userId!, data.tokenId);
        
        if (result.success) {
          // Broadcast move to all players in room
          io.to(data.roomId).emit('move-made', {
            playerId: socket.userId,
            tokenId: data.tokenId,
            diceValue: result.diceValue,
            gameState: result.game,
            message: result.message
          });

          // Check if game ended
          if (result.game?.status === 'COMPLETED') {
            io.to(data.roomId).emit('game-ended', {
              winner: result.game.winner,
              prize: result.game.prize
            });
          }
        } else {
          socket.emit('move-error', { message: result.message });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to make move' });
      }
    });

    // Chat message
    socket.on('chat-message', (data: { roomId: string; message: string }) => {
      io.to(data.roomId).emit('chat-message', {
        playerId: socket.userId,
        message: data.message,
        timestamp: new Date()
      });
    });

    // Leave room
    socket.on('leave-room', () => {
      if (socket.roomId) {
        socket.leave(socket.roomId);
        socket.to(socket.roomId).emit('player-left', { playerId: socket.userId });
        socket.roomId = undefined;
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User ${socket.userId} disconnected`);
      if (socket.roomId) {
        socket.to(socket.roomId).emit('player-disconnected', { 
          playerId: socket.userId 
        });
      }
    });
  });
};

// Extend GameService with socket-specific methods
declare module './game.service' {
  namespace GameService {
    function updatePlayerReady(roomId: string, userId: string): Promise<{ success: boolean; game?: any; message: string }>;
  }
}

// Add the method to GameService
GameService.updatePlayerReady = async function(roomId: string, userId: string) {
  try {
    const { Game } = require('../models/Game');
    
    const game = await Game.findOne({ roomId, status: 'WAITING' });
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    const player = game.players.find((p: any) => p.userId.toString() === userId);
    if (!player) {
      return { success: false, message: 'Player not in game' };
    }

    player.isReady = !player.isReady;
    await game.save();

    return { success: true, game, message: 'Ready status updated' };
  } catch (error) {
    return { success: false, message: 'Failed to update ready status' };
  }
};