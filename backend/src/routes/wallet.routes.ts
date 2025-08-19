import express from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate } from '../middlewares/auth';
import { validate, walletSchemas } from '../middlewares/validation';

const router = express.Router();

// All wallet routes require authentication
router.use(authenticate);

// Get wallet balance
router.get('/balance', WalletController.getBalance);

// Add money to wallet
router.post('/add-money', validate(walletSchemas.addMoney), WalletController.addMoney);

// Verify payment
router.post('/verify-payment', WalletController.verifyPayment);

// Withdraw money
router.post('/withdraw', validate(walletSchemas.withdraw), WalletController.withdraw);

// Get transaction history
router.get('/history', WalletController.getTransactionHistory);

// Get wallet summary
router.get('/summary', WalletController.getWalletSummary);

export default router;