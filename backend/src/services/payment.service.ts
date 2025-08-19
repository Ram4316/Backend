import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Transaction } from '../models/Transaction';
import { Wallet } from '../models/Wallet';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

export class PaymentService {
  static async createOrder(amount: number, userId: string): Promise<any> {
    try {
      const order = await razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: `order_${userId}_${Date.now()}`,
        payment_capture: 1
      });

      // Create pending transaction
      await Transaction.create({
        userId,
        type: 'DEPOSIT',
        amount,
        status: 'PENDING',
        description: `Add money to wallet`,
        paymentGatewayId: order.id
      });

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      };
    } catch (error) {
      console.error('Payment order creation failed:', error);
      return {
        success: false,
        message: 'Failed to create payment order'
      };
    }
  }

  static async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify signature
      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        // Update transaction as failed
        await Transaction.findOneAndUpdate(
          { paymentGatewayId: razorpayOrderId },
          { status: 'FAILED' }
        );

        return {
          success: false,
          message: 'Payment verification failed'
        };
      }

      // Get payment details from Razorpay
      const payment = await razorpay.payments.fetch(razorpayPaymentId);
      const amount = payment.amount / 100; // Convert from paise

      // Update transaction
      const transaction = await Transaction.findOneAndUpdate(
        { paymentGatewayId: razorpayOrderId },
        {
          status: 'COMPLETED',
          paymentMethod: payment.method
        },
        { new: true }
      );

      if (!transaction) {
        return {
          success: false,
          message: 'Transaction not found'
        };
      }

      // Update wallet balance
      const wallet = await Wallet.findOneAndUpdate(
        { userId },
        {
          $inc: {
            balance: amount,
            totalDeposited: amount
          }
        },
        { new: true, upsert: true }
      );

      return {
        success: true,
        message: 'Payment successful'
      };
    } catch (error) {
      console.error('Payment verification failed:', error);
      return {
        success: false,
        message: 'Payment verification failed'
      };
    }
  }

  static async processWithdrawal(
    userId: string,
    amount: number,
    method: string,
    details: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check wallet balance
      const wallet = await Wallet.findOne({ userId });
      if (!wallet || wallet.balance < amount) {
        return {
          success: false,
          message: 'Insufficient balance'
        };
      }

      // Deduct amount from wallet
      await Wallet.findOneAndUpdate(
        { userId },
        {
          $inc: {
            balance: -amount,
            totalWithdrawn: amount
          }
        }
      );

      // Create withdrawal transaction
      const transaction = await Transaction.create({
        userId,
        type: 'WITHDRAWAL',
        amount,
        status: 'PENDING',
        description: `Withdrawal via ${method}`,
        paymentMethod: method,
        ...(method === 'UPI' ? { upiId: details.upiId } : { bankAccount: details })
      });

      // In production, integrate with payment gateway for automatic withdrawals
      // For now, mark as pending for manual processing

      return {
        success: true,
        message: 'Withdrawal request submitted successfully'
      };
    } catch (error) {
      console.error('Withdrawal processing failed:', error);
      return {
        success: false,
        message: 'Withdrawal processing failed'
      };
    }
  }
}