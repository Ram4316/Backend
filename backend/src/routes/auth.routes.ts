import express from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate, authSchemas } from '../middlewares/validation';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Send OTP
router.post('/send-otp', validate(authSchemas.sendOtp), AuthController.sendOTP);

// Verify OTP and login
router.post('/verify', validate(authSchemas.verifyOtp), AuthController.verifyOTP);

// Get current user profile
router.get('/profile', authenticate, AuthController.getProfile);

// Update profile
router.put('/profile', authenticate, AuthController.updateProfile);

// Refresh token
router.post('/refresh', authenticate, AuthController.refreshToken);

// Logout
router.post('/logout', authenticate, AuthController.logout);

export default router;