import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  balance: number;
  lockedAmount: number; // Amount locked in active games
  totalDeposited: number;
  totalWithdrawn: number;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  lockedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDeposited: {
    type: Number,
    default: 0,
    min: 0
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Ensure balance is never negative
walletSchema.pre('save', function(next) {
  if (this.balance < 0) {
    throw new Error('Wallet balance cannot be negative');
  }
  next();
});

export const Wallet = mongoose.model<IWallet>('Wallet', walletSchema);