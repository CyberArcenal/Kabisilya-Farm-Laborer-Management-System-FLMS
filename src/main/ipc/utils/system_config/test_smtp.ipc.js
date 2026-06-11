// src/main/ipc/utils/system_config/test_smtp.ipc.js
const nodemailer = require("nodemailer");
const { logger } = require("../../../../utils/logger");

module.exports = async (params) => {
  const { settings } = params;
  
  if (!settings.email_enabled) {
    return { status: false, message: "Email notifications are disabled", data: null };
  }

  const { email_smtp_host, email_smtp_port, email_from_address, email_smtp_username, email_smtp_password } = settings;

  if (!email_smtp_host || !email_smtp_port || !email_smtp_username || !email_smtp_password) {
    return { status: false, message: "SMTP configuration incomplete (host, port, username, password required)", data: null };
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: email_smtp_host,
      port: parseInt(email_smtp_port, 10),
      secure: email_smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: email_smtp_username,
        pass: email_smtp_password,
      },
      tls: {
        rejectUnauthorized: false, // for testing only – remove in production
      },
    });

    // Verify connection
    await transporter.verify();
    
    logger.info(`SMTP test successful for ${email_smtp_username} using ${email_smtp_host}:${email_smtp_port}`);
    return { status: true, message: "SMTP connection successful", data: null };
  } catch (error) {
    logger.error(`SMTP test failed: ${error.message}`);
    return { status: false, message: `SMTP connection failed: ${error.message}`, data: null };
  }
};