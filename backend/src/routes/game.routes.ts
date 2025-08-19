import express from 'express';
import { GameController } from '../controllers/game.controller';
import { authenticate } from '../middlewares/auth';
import { validate, gameSchemas } from '../middlewares/validation';

const router = express.Router();

// All game routes require authentication
router.use(authenticate);

// Create new game
router.post('/create', validate(gameSchemas.createGame), GameController.createGame);

// Join existing game
router.post('/join', validate(gameSchemas.joinGame), GameController.joinGame);

// Get available games
router.get('/available', GameController.getAvailableGames);

// Get game details
router.get('/:roomId', GameController.getGameDetails);

// Get game history
router.get('/history/me', GameController.getGameHistory);

// Get player stats
router.get('/stats/me', GameController.getPlayerStats);

export default router;