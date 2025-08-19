import { Request, Response } from 'express';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { OTPService } from '../services/otp.service';
import { generateToken } from '../utils/jwt';

interface AuthRequest extends Request {
  user?: any;
}

export class AuthController {
  static async sendOTP(req: Request, res: Response) {
    try {
      const { phone } = req.body;

      const result = await OTPService.sendOTP(phone);

      res.status(200).json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP'
      });
    }
  }

  static async verifyOTP(req: Request, res: Response) {
    try {
      const { phone, otp } = req.body;

      // Verify OTP
      const isValid = OTPService.verifyOTP(phone, otp);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP'
        });
      }

      // Find or create user
      let user = await User.findOne({ phone });

      if (!user) {
        user = await User.create({
          phone,
          isPhoneVerified: true,
          referralCode: Math.random().toString(36).substr(2, 8).toUpperCase()
        });

        // Create wallet for new user
        await Wallet.create({
          userId: user._id,
          balance: 0
        });
      } else {
        user.isPhoneVerified = true;
        user.lastLogin = new Date();
        await user.save();
      }

      // Generate JWT token
      const token = generateToken({
        id: user._id,
        phone: user.phone
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          isPhoneVerified: user.isPhoneVerified,
          isEmailVerified: user.isEmailVerified,
          isKycVerified: user.isKycVerified,
          gameStats: user.gameStats,
          referralCode: user.referralCode
        }
      });
    } catch (error) {
      console.error('OTP verification failed:', error);
      res.status(500).json({
        success: false,
        message: 'OTP verification failed'
      });
    }
  }

  static async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user._id).select('-__v');
      const wallet = await Wallet.findOne({ userId: req.user._id });

      res.status(200).json({
        success: true,
        user,
        wallet
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, email, avatar } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { name, email, avatar },
        { new: true, runValidators: true }
      ).select('-__v');

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  static async refreshToken(req: AuthRequest, res: Response) {
    try {
      const newToken = generateToken({
        id: req.user._id,
        phone: req.user.phone
      });

      res.status(200).json({
        success: true,
        token: newToken
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token'
      });
    }
  }

  static async logout(req: AuthRequest, res: Response) {
    try {
      // In a production app, you might want to blacklist the token
      // For now, just send success response
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
}