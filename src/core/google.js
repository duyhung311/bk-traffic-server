const { OAuth2Client } = require('google-auth-library');
const request = require('request-promise');
const credentials = require('../config/client_secret.json').web;
const Logger = require('./logger');

const googleAppIds = [];
if (process.env.GOOGLE_CLIENT_ID) {
  googleAppIds.push(process.env.GOOGLE_CLIENT_ID);
}
if (process.env.GOOGLE_CLIENT_ID_2) {
  googleAppIds.push(process.env.GOOGLE_CLIENT_ID_2);
}
if (process.env.GOOGLE_CLIENT_ID_3) {
  googleAppIds.push(process.env.GOOGLE_CLIENT_ID_3);
}
if (process.env.GOOGLE_CLIENT_ID_4) {
  googleAppIds.push(process.env.GOOGLE_CLIENT_ID_4);
}
const client = new OAuth2Client(googleAppIds);
// const { client_id, client_secret, redirect_uris } = credentials;
// const client = new OAuth2Client(client_id, client_secret,);

const USER_INFO_API = 'https://oauth2.googleapis.com/tokeninfo?id_token=';

async function validateToken(googleId, googleToken) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      client_id: googleAppIds,
    });
    const payload = ticket.getPayload();
    const userid = payload.sub;
    return googleId === userid;
  } catch (error) {
    Logger.error('Google verify error');
    Logger.error(error);
    return false;
  }
}

async function getUserInfoWithGoogleServerToken(googleServerToken) {
  try {
    Logger.info('Google token', googleServerToken, credentials);
    const oAuth2Client = new OAuth2Client(credentials.client_id, credentials.client_secret);
    Logger.info('oauth2', oAuth2Client);
    const googleCredential = await oAuth2Client.getToken(googleServerToken);
    Logger.info('Google credential', googleCredential);
    oAuth2Client.setCredentials(googleCredential.tokens);
    // const plus = google.plus({
    //     version: 'v1',
    //     auth: oAuth2Client,
    // });
    // const data =
    //     await plus.people.get({ userId: 'me' });
    // return data;
  } catch (error) {
    Logger.error('Google get user error %o', error);
  }
}

async function getGoogleUser(token) {
  const api = USER_INFO_API + token;

  const options = {
    uri: api,
    json: true, // Automatically parses the JSON string in the response
  };

  try {
    const data = await request(options);
    return data;
  } catch (err) {
    Logger.error('Get google user error');
    Logger.error(err);
  }
  return null;
}

module.exports = {
  getGoogleUser,
  validateToken,
  getUserInfoWithGoogleServerToken,
};
