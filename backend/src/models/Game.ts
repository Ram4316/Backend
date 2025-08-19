import mongoose, { Document, Schema } from 'mongoose';

export interface IGame extends Document {
  roomId: string;
  gameType: 'CLASSIC_2P' | 'CLASSIC_4P' | 'QUICK_2P' | 'TOURNAMENT';
  entryFee: number;
  prize: number;
  maxPlayers: number;
  players: {
    userId: mongoose.Types.ObjectId;
    position: number; // 0-3 for board positions
    tokens: Array<{
      id: number;
      position: number; // -1 for home, 0-51 for board positions, 52-55 for safe zone
      isInSafeZone: boolean;
      isFinished: boolean;
    }>;
    isReady: boolean;
    joinedAt: Date;
  }[];
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  currentTurn: number; // Player index whose turn it is
  diceValue?: number;
  lastMove?: {
    playerId: mongoose.Types.ObjectId;
    tokenId: number;
    from: number;
    to: number;
    timestamp: Date;
  };
  winner?: mongoose.Types.ObjectId;
  gameLog: Array<{
    action: string;
    playerId: mongoose.Types.ObjectId;
    data: any;
    timestamp: Date;
  }>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const gameSchema = new Schema<IGame>({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  gameType: {
    type: String,
    enum: ['CLASSIC_2P', 'CLASSIC_4P', 'QUICK_2P', 'TOURNAMENT'],
    required: true
  },
  entryFee: {
    type: Number,
    required: true,
    min: 0
  },
  prize: {
    type: Number,
    required: true,
    min: 0
  },
  maxPlayers: {
    type: Number,
    required: true,
    min: 2,
    max: 4
  },
  players: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    position: {
      type: Number,
      required: true,
      min: 0,
      max: 3
    },
    tokens: [{
      id: { type: Number, required: true },
      position: { type: Number, default: -1 },
      isInSafeZone: { type: Boolean, default: false },
      isFinished: { type: Boolean, default: false }
    }],
    isReady: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'WAITING'
  },
  currentTurn: {
    type: Number,
    default: 0
  },
  diceValue: Number,
  lastMove: {
    playerId: { type: Schema.Types.ObjectId, ref: 'User' },
    tokenId: Number,
    from: Number,
    to: Number,
    timestamp: { type: Date, default: Date.now }
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  gameLog: [{
    action: { type: String, required: true },
    playerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    data: Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }],
  startedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Generate unique room ID before saving
gameSchema.pre('save', function(next) {
  if (!this.roomId) {
    this.roomId = Math.random().toString(36).substr(2, 10).toUpperCase();
  }
  next();
});

export const Game = mongoose.model<IGame>('Game', gameSchema);