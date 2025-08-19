import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const user = await User.findById(decoded.id).select('-__v');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account has been blocked. Contact support.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Access denied.'
    });
  }
};