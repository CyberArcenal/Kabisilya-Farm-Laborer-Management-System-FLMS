// src/main/ipc/utils/system_config/test_sms.ipc.js
const twilio = require("twilio");
const { logger } = require("../../../../utils/logger");

module.exports = async (params) => {
  const { settings } = params;
  
  if (!settings.sms_enabled) {
    return { status: false, message: "SMS notifications are disabled", data: null };
  }

  const { twilio_account_sid, twilio_auth_token, twilio_phone_number } = settings;

  if (!twilio_account_sid || !twilio_auth_token) {
    return { status: false, message: "Twilio Account SID and Auth Token required", data: null };
  }

  try {
    const client = twilio(twilio_account_sid, twilio_auth_token);
    
    // Simple test: fetch account details (doesn't send SMS)
    const account = await client.api.accounts(twilio_account_sid).fetch();
    
    logger.info(`SMS test successful for account: ${account.friendlyName}`);
    return { status: true, message: "SMS (Twilio) connection successful", data: null };
  } catch (error) {
    logger.error(`SMS test failed: ${error.message}`);
    return { status: false, message: `SMS connection failed: ${error.message}`, data: null };
  }
};