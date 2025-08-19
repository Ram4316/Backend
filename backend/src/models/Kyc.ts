import mongoose, { Document, Schema } from 'mongoose';

export interface IKyc extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  documents: {
    panCard: {
      number: string;
      imageUrl: string;
      verified: boolean;
    };
    aadhaar: {
      number: string;
      imageUrl: string;
      verified: boolean;
    };
    bankAccount: {
      accountNumber: string;
      ifscCode: string;
      accountHolder: string;
      verified: boolean;
    };
  };
  rejectionReason?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const kycSchema = new Schema<IKyc>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  documents: {
    panCard: {
      number: String,
      imageUrl: String,
      verified: { type: Boolean, default: false }
    },
    aadhaar: {
      number: String,
      imageUrl: String,
      verified: { type: Boolean, default: false }
    },
    bankAccount: {
      accountNumber: String,
      ifscCode: String,
      accountHolder: String,
      verified: { type: Boolean, default: false }
    }
  },
  rejectionReason: String,
  verifiedAt: Date
}, {
  timestamps: true
});

export const Kyc = mongoose.model<IKyc>('Kyc', kycSchema);