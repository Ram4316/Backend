import { Request, Response } from 'express';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { Transaction } from '../models/Transaction';
import { Kyc } from '../models/Kyc';
import { Wallet } from '../models/Wallet';
import mongoose from 'mongoose';

export class AdminController {
  static async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      const filter: any = {};
      if (search) {
        filter.$or = [
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(filter);

      // Get wallet info for each user
      const usersWithWallet = await Promise.all(
        users.map(async (user) => {
          const wallet = await Wallet.findOne({ userId: user._id });
          return {
            ...user.toObject(),
            wallet
          };
        })
      );

      res.status(200).json({
        success: true,
        users: usersWithWallet,
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
        message: 'Failed to fetch users'
      });
    }
  }

  static async getUserDetails(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      }

      const user = await User.findById(userId);
      const wallet = await Wallet.findOne({ userId });
      const kyc = await Kyc.findOne({ userId });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get user's recent transactions
      const transactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10);

      // Get user's recent games
      const games = await Game.find({ 'players.userId': userId })
        .sort({ createdAt: -1 })
        .limit(10);

      res.status(200).json({
        success: true,
        user,
        wallet,
        kyc,
        recentTransactions: transactions,
        recentGames: games
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user details'
      });
    }
  }

  static async blockUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        { isBlocked: true },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'User blocked successfully',
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to block user'
      });
    }
  }

  static async unblockUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await User.findByIdAndUpdate(
        userId,
        { isBlocked: false },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'User unblocked successfully',
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to unblock user'
      });
    }
  }

  static async getAllGames(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;

      const filter: any = {};
      if (status) {
        filter.status = status;
      }

      const games = await Game.find(filter)
        .populate('players.userId', 'name phone')
        .populate('winner', 'name phone')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await Game.countDocuments(filter);

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
        message: 'Failed to fetch games'
      });
    }
  }

  static async getGameDetails(req: Request, res: Response) {
    try {
      const { gameId } = req.params;

      const game = await Game.findById(gameId)
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

  static async getPendingKyc(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const pendingKyc = await Kyc.find({ status: 'PENDING' })
        .populate('userId', 'name phone email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await Kyc.countDocuments({ status: 'PENDING' });

      res.status(200).json({
        success: true,
        kycRequests: pendingKyc,
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
        message: 'Failed to fetch pending KYC requests'
      });
    }
  }

  static async approveKyc(req: Request, res: Response) {
    try {
      const { kycId } = req.params;

      const kyc = await Kyc.findByIdAndUpdate(
        kycId,
        {
          status: 'APPROVED',
          verifiedAt: new Date()
        },
        { new: true }
      );

      if (!kyc) {
        return res.status(404).json({
          success: false,
          message: 'KYC request not found'
        });
      }

      // Update user's KYC status
      await User.findByIdAndUpdate(kyc.userId, { isKycVerified: true });

      res.status(200).json({
        success: true,
        message: 'KYC approved successfully',
        kyc
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to approve KYC'
      });
    }
  }

  static async rejectKyc(req: Request, res: Response) {
    try {
      const { kycId } = req.params;
      const { reason } = req.body;

      const kyc = await Kyc.findByIdAndUpdate(
        kycId,
        {
          status: 'REJECTED',
          rejectionReason: reason
        },
        { new: true }
      );

      if (!kyc) {
        return res.status(404).json({
          success: false,
          message: 'KYC request not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'KYC rejected',
        kyc
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to reject KYC'
      });
    }
  }

  static async getAllTransactions(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string;
      const status = req.query.status as string;

      const filter: any = {};
      if (type) filter.type = type;
      if (status) filter.status = status;

      const transactions = await Transaction.find(filter)
        .populate('userId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await Transaction.countDocuments(filter);

      res.status(200).json({
        success: true,
        transactions,
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
        message: 'Failed to fetch transactions'
      });
    }
  }

  static async updateTransactionStatus(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const { status, notes } = req.body;

      const transaction = await Transaction.findByIdAndUpdate(
        transactionId,
        { 
          status,
          ...(notes && { 'metadata.adminNotes': notes })
        },
        { new: true }
      );

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Transaction status updated',
        transaction
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update transaction status'
      });
    }
  }

  static async getDashboardStats(req: Request, res: Response) {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isBlocked: false });
      const totalGames = await Game.countDocuments();
      const activeGames = await Game.countDocuments({ status: 'IN_PROGRESS' });

      // Revenue stats
      const totalRevenue = await Transaction.aggregate([
        { $match: { type: 'DEPOSIT', status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const totalWithdrawals = await Transaction.aggregate([
        { $match: { type: 'WITHDRAWAL', status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      // Today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayStats = await Transaction.aggregate([
        { $match: { createdAt: { $gte: today } } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        stats: {
          users: {
            total: totalUsers,
            active: activeUsers,
            blocked: totalUsers - activeUsers
          },
          games: {
            total: totalGames,
            active: activeGames
          },
          revenue: {
            totalDeposits: totalRevenue[0]?.total || 0,
            totalWithdrawals: totalWithdrawals[0]?.total || 0,
            netRevenue: (totalRevenue[0]?.total || 0) - (totalWithdrawals[0]?.total || 0)
          },
          today: todayStats
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard stats'
      });
    }
  }

  static async getRevenueAnalytics(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const revenueData = await Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: 'COMPLETED'
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              type: '$type'
            },
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      res.status(200).json({
        success: true,
        revenueData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch revenue analytics'
      });
    }
  }

  static async getUserAnalytics(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const userGrowth = await User.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const userActivity = await Game.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            gamesPlayed: { $sum: 1 },
            uniquePlayers: { $addToSet: '$players.userId' }
          }
        },
        {
          $addFields: {
            uniquePlayersCount: { $size: '$uniquePlayers' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.status(200).json({
        success: true,
        userGrowth,
        userActivity
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user analytics'
      });
    }
  }

  static async getPendingWithdrawals(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const withdrawals = await Transaction.find({
        type: 'WITHDRAWAL',
        status: 'PENDING'
      })
        .populate('userId', 'name phone email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await Transaction.countDocuments({
        type: 'WITHDRAWAL',
        status: 'PENDING'
      });

      res.status(200).json({
        success: true,
        withdrawals,
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
        message: 'Failed to fetch pending withdrawals'
      });
    }
  }

  static async processWithdrawal(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const { status, notes } = req.body; // status: 'COMPLETED' or 'FAILED'

      const transaction = await Transaction.findByIdAndUpdate(
        transactionId,
        {
          status,
          'metadata.processedAt': new Date(),
          'metadata.adminNotes': notes
        },
        { new: true }
      );

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // If withdrawal failed, refund the amount
      if (status === 'FAILED') {
        await Wallet.findOneAndUpdate(
          { userId: transaction.userId },
          { $inc: { balance: transaction.amount } }
        );
      }

      res.status(200).json({
        success: true,
        message: `Withdrawal ${status.toLowerCase()} successfully`,
        transaction
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to process withdrawal'
      });
    }
  }
}