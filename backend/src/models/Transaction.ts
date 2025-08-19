import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'GAME_ENTRY' | 'GAME_WINNING' | 'REFUND' | 'BONUS' | 'REFERRAL';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description: string;
  gameId?: mongoose.Types.ObjectId;
  paymentGatewayId?: string;
  paymentMethod?: string;
  upiId?: string;
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    accountHolder: string;
  };
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['DEPOSIT', 'WITHDRAWAL', 'GAME_ENTRY', 'GAME_WINNING', 'REFUND', 'BONUS', 'REFERRAL'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  description: {
    type: String,
    required: true
  },
  gameId: {
    type: Schema.Types.ObjectId,
    ref: 'Game'
  },
  paymentGatewayId: String,
  paymentMethod: String,
  upiId: String,
  bankAccount: {
    accountNumber: String,
    ifscCode: String,
    accountHolder: String
  },
  metadata: Schema.Types.Mixed
}, {
  timestamps: true
});

// Index for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);