import { Request, Response } from 'express';
import { GameService } from '../services/game.service';
import { Game } from '../models/Game';
import { User } from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

export class GameController {
  static async createGame(req: AuthRequest, res: Response) {
    try {
      const { gameType, entryFee } = req.body;

      const result = await GameService.createGame(req.user._id, gameType, entryFee);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          game: result.game
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create game'
      });
    }
  }

  static async joinGame(req: AuthRequest, res: Response) {
    try {
      const { roomId } = req.body;

      const result = await GameService.joinGame(req.user._id, roomId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          game: result.game
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to join game'
      });
    }
  }

  static async getAvailableGames(req: AuthRequest, res: Response) {
    try {
      const gameType = req.query.gameType as string;
      const games = await GameService.getAvailableGames(gameType);

      res.status(200).json({
        success: true,
        games
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch available games'
      });
    }
  }

  static async getGameDetails(req: AuthRequest, res: Response) {
    try {
      const { roomId } = req.params;

      const game = await Game.findOne({ roomId })
        .populate('players.userId', 'name phone avatar gameStats')
        .populate('winner', 'name phone avatar');

      if (!game) {
        return res.status(404).json({
          success: false,
          message: 'Game not found'
        });
      }

      res.status(200).json({
        success: true,
        game
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch game details'
      });
    }
  }

  static async getGameHistory(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const games = await Game.find({
        'players.userId': req.user._id,
        status: 'COMPLETED'
      })
        .populate('players.userId', 'name phone')
        .populate('winner', 'name phone')
        .sort({ completedAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await Game.countDocuments({
        'players.userId': req.user._id,
        status: 'COMPLETED'
      });

      res.status(200).json({
        success: true,
        games,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch game history'
      });
    }
  }

  static async getPlayerStats(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user._id).select('gameStats');

      // Get detailed stats
      const totalGames = await Game.countDocuments({
        'players.userId': req.user._id,
        status: 'COMPLETED'
      });

      const gamesWon = await Game.countDocuments({
        winner: req.user._id
      });

      const recentGames = await Game.find({
        'players.userId': req.user._id,
        status: 'COMPLETED'
      })
        .sort({ completedAt: -1 })
        .limit(10)
        .populate('winner', 'name phone');

      res.status(200).json({
        success: true,
        stats: {
          ...user?.gameStats,
          totalGames,
          gamesWon,
          winRate: totalGames > 0 ? (gamesWon / totalGames) * 100 : 0
        },
        recentGames
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch player stats'
      });
    }
  }
}