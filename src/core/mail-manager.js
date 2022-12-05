const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const Logger = require('./logger');
const { BaseError, ErrorType } = require('./error');

const { OAuth2 } = google.auth;
const fsPromise = fs.promises;
let accessToken;

/**
 * Auth with Google
 */
async function init() {
  const oauth2Client = new OAuth2(
    process.env.MAIL_CLIEND_ID, // ClientID
    process.env.MAIL_CLIEND_SECRET, // Client Secret
    'https://developers.google.com/oauthplayground', // Redirect URL
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.MAIL_REFRESH_TOKEN,
  });
  try {
    const tokens = await oauth2Client.refreshAccessToken();
    accessToken = tokens.credentials.access_token;
    Logger.info('Init mail sender successfully');
  } catch (error) {
    Logger.error('Init mail sender failure');
  }
}

/**
 * Send a email
 */
async function sendMail(email, title, body) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.MAIL_USERNAME,
      clientId: process.env.MAIL_CLIEND_ID,
      clientSecret: process.env.MAIL_CLIEND_SECRET,
      refreshToken: process.env.MAIL_REFRESH_TOKEN,
      accessToken,
    },
  });

  const mailOptions = {
    from: process.env.MAIL_USERNAME,
    to: email,
    subject: title,
    html: body,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Send verify email
 * @param {*} email
 * @param {*} token
 */
async function sendVerifyEmail(email, token) {
  try {
    const appName = process.env.APP_NAME || 'MuaChung';
    const url = `${process.env.HOST}/api/user/verify-account?email=${email}&token=${token}`;
    let template = await fsPromise.readFile(path.join(__dirname, '../html-templates/account-verification.html'), 'utf8');
    template = template.replace(/{{action_url}}/g, url).replace(/{{app_name}}/g, appName);
    const subject = 'Verify your account';

    return await sendMail(email, subject, template);
  } catch (error) {
    Logger.error(error);
    throw new BaseError({
      ...ErrorType.serviceError,
      message: 'Send verify email failure',
    });
  }
}

/**
 * Send reset password email
 * @param {*} email
 * @param {*} token
 */
async function sendResetPasswordEmail(email, token) {
  try {
    const appName = process.env.APP_NAME || 'MuaChung';
    const url = `${process.env.HOST}/api/user/reset-password?email=${email}&token=${token}`;
    let template = await fsPromise.readFile(path.join(__dirname, '../html-templates/forgot-password.html'), 'utf8');
    template = template.replace(/{{action_url}}/g, url).replace(/{{app_name}}/g, appName);
    const subject = 'Reset password';

    return await sendMail(email, subject, template);
  } catch (error) {
    Logger.error(error);
    throw new BaseError({
      ...ErrorType.serviceError,
      message: 'Send reset password email failure',
    });
  }
}

module.exports = {
  init,
  sendVerifyEmail,
  sendResetPasswordEmail,
};
