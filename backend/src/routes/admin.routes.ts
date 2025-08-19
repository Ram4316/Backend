import express from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, adminOnly } from '../middlewares/auth';

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticate);
router.use(adminOnly);

// User management
router.get('/users', AdminController.getAllUsers);
router.get('/users/:userId', AdminController.getUserDetails);
router.post('/users/:userId/block', AdminController.blockUser);
router.post('/users/:userId/unblock', AdminController.unblockUser);

// Game management
router.get('/games', AdminController.getAllGames);
router.get('/games/:gameId', AdminController.getGameDetails);

// KYC management
router.get('/kyc/pending', AdminController.getPendingKyc);
router.post('/kyc/:kycId/approve', AdminController.approveKyc);
router.post('/kyc/:kycId/reject', AdminController.rejectKyc);

// Transaction management
router.get('/transactions', AdminController.getAllTransactions);
router.post('/transactions/:transactionId/update-status', AdminController.updateTransactionStatus);

// Analytics and reports
router.get('/analytics/dashboard', AdminController.getDashboardStats);
router.get('/analytics/revenue', AdminController.getRevenueAnalytics);
router.get('/analytics/users', AdminController.getUserAnalytics);

// Withdrawal management
router.get('/withdrawals/pending', AdminController.getPendingWithdrawals);
router.post('/withdrawals/:transactionId/process', AdminController.processWithdrawal);

export default router;