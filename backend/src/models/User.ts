import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  email?: string;
  name?: string;
  avatar?: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isKycVerified: boolean;
  isBlocked: boolean;
  lastLogin: Date;
  gameStats: {
    totalGames: number;
    gamesWon: number;
    totalEarnings: number;
    winRate: number;
  };
  referralCode: string;
  referredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  phone: {
    type: String,
    required: true,
    unique: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Invalid phone number']
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  },
  name: {
    type: String,
    trim: true,
    maxlength: 50
  },
  avatar: String,
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isKycVerified: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  gameStats: {
    totalGames: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 }
  },
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  referredBy: String
}, {
  timestamps: true
});

// Generate referral code before saving
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = Math.random().toString(36).substr(2, 8).toUpperCase();
  }
  next();
});

// Update win rate when game stats change
userSchema.pre('save', function(next) {
  if (this.gameStats.totalGames > 0) {
    this.gameStats.winRate = (this.gameStats.gamesWon / this.gameStats.totalGames) * 100;
  }
  next();
});

export const User = mongoose.model<IUser>('User', userSchema);