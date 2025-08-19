import { Request, Response } from 'express';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { PaymentService } from '../services/payment.service';

interface AuthRequest extends Request {
  user?: any;
}

export class WalletController {
  static async getBalance(req: AuthRequest, res: Response) {
    try {
      const wallet = await Wallet.findOne({ userId: req.user._id });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      res.status(200).json({
        success: true,
        wallet: {
          balance: wallet.balance,
          lockedAmount: wallet.lockedAmount,
          availableBalance: wallet.balance - wallet.lockedAmount
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wallet balance'
      });
    }
  }

  static async addMoney(req: AuthRequest, res: Response) {
    try {
      const { amount, paymentMethod } = req.body;

      if (amount < 10 || amount > 100000) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be between ₹10 and ₹100,000'
        });
      }

      const result = await PaymentService.createOrder(amount, req.user._id);

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to initiate payment'
      });
    }
  }

  static async verifyPayment(req: AuthRequest, res: Response) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      const result = await PaymentService.verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        req.user._id
      );

      if (result.success) {
        const wallet = await Wallet.findOne({ userId: req.user._id });
        return res.status(200).json({
          success: true,
          message: result.message,
          wallet
        });
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  }

  static async withdraw(req: AuthRequest, res: Response) {
    try {
      const { amount, method, upiId, bankDetails } = req.body;

      // Check minimum withdrawal amount
      if (amount < 10) {
        return res.status(400).json({
          success: false,
          message: 'Minimum withdrawal amount is ₹10'
        });
      }

      // Check if KYC is verified
      if (!req.user.isKycVerified) {
        return res.status(400).json({
          success: false,
          message: 'KYC verification required for withdrawals'
        });
      }

      const details = method === 'UPI' ? { upiId } : bankDetails;
      const result = await PaymentService.processWithdrawal(
        req.user._id,
        amount,
        method,
        details
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Withdrawal processing failed'
      });
    }
  }

  static async getTransactionHistory(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string;

      const filter: any = { userId: req.user._id };
      if (type) {
        filter.type = type;
      }

      const transactions = await Transaction.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('gameId', 'roomId gameType');

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
        message: 'Failed to fetch transaction history'
      });
    }
  }

  static async getWalletSummary(req: AuthRequest, res: Response) {
    try {
      const wallet = await Wallet.findOne({ userId: req.user._id });
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      // Get transaction summary
      const transactionSummary = await Transaction.aggregate([
        { $match: { userId: req.user._id } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        wallet,
        transactionSummary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wallet summary'
      });
    }
  }
}