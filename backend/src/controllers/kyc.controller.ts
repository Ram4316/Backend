import { Request, Response } from 'express';
import { Kyc } from '../models/Kyc';
import { User } from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

export class KycController {
  static async uploadDocuments(req: AuthRequest, res: Response) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { panNumber, aadhaarNumber } = req.body;

      if (!files || (!files.panCard && !files.aadhaar)) {
        return res.status(400).json({
          success: false,
          message: 'At least one document is required'
        });
      }

      let kyc = await Kyc.findOne({ userId: req.user._id });

      if (!kyc) {
        kyc = new Kyc({
          userId: req.user._id,
          status: 'PENDING',
          documents: {}
        });
      }

      // Update PAN details
      if (files.panCard && panNumber) {
        kyc.documents.panCard = {
          number: panNumber,
          imageUrl: `/uploads/kyc/${files.panCard[0].filename}`,
          verified: false
        };
      }

      // Update Aadhaar details
      if (files.aadhaar && aadhaarNumber) {
        kyc.documents.aadhaar = {
          number: aadhaarNumber.replace(/\d(?=\d{4})/g, "X"), // Mask Aadhaar number
          imageUrl: `/uploads/kyc/${files.aadhaar[0].filename}`,
          verified: false
        };
      }

      kyc.status = 'PENDING';
      await kyc.save();

      res.status(200).json({
        success: true,
        message: 'Documents uploaded successfully',
        kyc
      });
    } catch (error) {
      console.error('Document upload failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload documents'
      });
    }
  }

  static async getKycStatus(req: AuthRequest, res: Response) {
    try {
      const kyc = await Kyc.findOne({ userId: req.user._id });

      res.status(200).json({
        success: true,
        kyc: kyc || { status: 'NOT_STARTED' }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch KYC status'
      });
    }
  }

  static async updateBankDetails(req: AuthRequest, res: Response) {
    try {
      const { accountNumber, ifscCode, accountHolder } = req.body;

      if (!accountNumber || !ifscCode || !accountHolder) {
        return res.status(400).json({
          success: false,
          message: 'All bank details are required'
        });
      }

      let kyc = await Kyc.findOne({ userId: req.user._id });

      if (!kyc) {
        kyc = new Kyc({
          userId: req.user._id,
          status: 'PENDING',
          documents: {}
        });
      }

      kyc.documents.bankAccount = {
        accountNumber,
        ifscCode,
        accountHolder,
        verified: false
      };

      await kyc.save();

      res.status(200).json({
        success: true,
        message: 'Bank details updated successfully',
        kyc
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update bank details'
      });
    }
  }
}