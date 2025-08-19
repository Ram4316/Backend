import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// In-memory OTP storage (use Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

export class OTPService {
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP
      otpStore.set(phone, { otp, expiresAt });

      // Send via Twilio (in production)
      if (process.env.NODE_ENV === 'production') {
        await client.messages.create({
          body: `Your Ludo Game OTP is: ${otp}. Valid for 5 minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
      } else {
        // In development, log OTP to console
        console.log(`📱 OTP for ${phone}: ${otp}`);
      }

      return {
        success: true,
        message: 'OTP sent successfully'
      };
    } catch (error) {
      console.error('OTP sending failed:', error);
      return {
        success: false,
        message: 'Failed to send OTP'
      };
    }
  }

  static verifyOTP(phone: string, otp: string): boolean {
    const storedData = otpStore.get(phone);

    if (!storedData) {
      return false;
    }

    if (new Date() > storedData.expiresAt) {
      otpStore.delete(phone);
      return false;
    }

    if (storedData.otp === otp) {
      otpStore.delete(phone);
      return true;
    }

    return false;
  }

  // Cleanup expired OTPs (run periodically)
  static cleanupExpiredOTPs(): void {
    const now = new Date();
    for (const [phone, data] of otpStore.entries()) {
      if (now > data.expiresAt) {
        otpStore.delete(phone);
      }
    }
  }
}

// Run cleanup every 5 minutes
setInterval(() => {
  OTPService.cleanupExpiredOTPs();
}, 5 * 60 * 1000);