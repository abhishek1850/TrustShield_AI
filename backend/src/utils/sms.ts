// TrustShield AI - SMS Delivery Utility
// Bank of Baroda Hackathon 2026

import dotenv from 'dotenv';
dotenv.config();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const CUSTOMER_PHONE_NUMBER = process.env.CUSTOMER_PHONE_NUMBER || '+919823001122'; // Default destination for hackathon testing

/**
 * Dispatches a behavior verification OTP code via Twilio SMS.
 * If credentials are not set, it logs a fallback secure message.
 */
export async function sendSmsOtp(username: string, otp: string): Promise<boolean> {
  const messageBody = `[TrustShield AI] Warning: Unusual behavior detected for user ${username}. Your step-up authorization code is: ${otp}. Expires in 5 minutes.`;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.log('\n=========================================================');
    console.log(`📡 [SMS GATEWAY SIMULATION]`);
    console.log(`To: ${CUSTOMER_PHONE_NUMBER} (${username})`);
    console.log(`Message: ${messageBody}`);
    console.log('=========================================================\n');
    return true;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const authString = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const params = new URLSearchParams();
    params.append('To', CUSTOMER_PHONE_NUMBER);
    params.append('From', TWILIO_FROM_NUMBER);
    params.append('Body', messageBody);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (response.ok) {
      console.log(`🔌 [SMS GATEWAY] OTP dispatched successfully to ${CUSTOMER_PHONE_NUMBER} via Twilio.`);
      return true;
    } else {
      const errorData = await response.json();
      console.error(`❌ [SMS GATEWAY] Twilio API Error: ${errorData.message}`);
      return false;
    }
  } catch (err: any) {
    console.error(`❌ [SMS GATEWAY] Failed to dispatch SMS via Twilio: `, err);
    return false;
  }
}
