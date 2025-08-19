import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        error: errorMessage
      });
    }
    
    next();
  };
};

// Validation schemas
export const authSchemas = {
  sendOtp: Joi.object({
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
      .messages({
        'string.pattern.base': 'Invalid phone number format'
      })
  }),

  verifyOtp: Joi.object({
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    otp: Joi.string().length(6).required()
  })
};

export const walletSchemas = {
  addMoney: Joi.object({
    amount: Joi.number().min(10).max(100000).required(),
    paymentMethod: Joi.string().valid('UPI', 'CARD', 'NETBANKING').required()
  }),

  withdraw: Joi.object({
    amount: Joi.number().min(10).required(),
    method: Joi.string().valid('UPI', 'BANK').required(),
    upiId: Joi.when('method', {
      is: 'UPI',
      then: Joi.string().required()
    }),
    bankDetails: Joi.when('method', {
      is: 'BANK',
      then: Joi.object({
        accountNumber: Joi.string().required(),
        ifscCode: Joi.string().required(),
        accountHolder: Joi.string().required()
      }).required()
    })
  })
};

export const gameSchemas = {
  createGame: Joi.object({
    gameType: Joi.string().valid('CLASSIC_2P', 'CLASSIC_4P', 'QUICK_2P', 'TOURNAMENT').required(),
    entryFee: Joi.number().min(1).max(10000).required()
  }),

  joinGame: Joi.object({
    roomId: Joi.string().required()
  }),

  makeMove: Joi.object({
    tokenId: Joi.number().min(0).max(3).required(),
    diceValue: Joi.number().min(1).max(6).required()
  })
};