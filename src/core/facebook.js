const request = require('request-promise');
const Logger = require('./logger');

let fbAccessToken = '';

function init() {
  const fbAppAccessTokenapi = `https://graph.facebook.com/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&grant_type=client_credentials`;

  const options = {
    uri: fbAppAccessTokenapi,
    json: true, // Automatically parses the JSON string in the response
  };

  request(options)
    .then((data) => {
      fbAccessToken = data.access_token;
      Logger.info('Verify facebook success');
    })
    .catch((err) => {
      Logger.error(err);
    });
}

async function verifyFacebookToken(fbId, fbToken) {
  const facebookVerificationApi = 'https://graph.facebook.com/debug_token?';

  const options = {
    uri: `${facebookVerificationApi}input_token=${fbToken}&access_token=${fbAccessToken}`,
    json: true, // Automatically parses the JSON string in the response
  };

  try {
    const response = await request(options);
    return response.data.user_id === fbId;
  } catch (err) {
    Logger.error('Verify facebook user error');
    Logger.error(err);
    return false;
  }
}

async function getUserInfo(fbId, fbToken) {
  const api = `https://graph.facebook.com/${fbId}?fields=name,email,birthday,gender,id&access_token=${fbToken}`;
  const options = {
    uri: api,
    json: true,
  };

  try {
    const result = await request(options);
    return result;
  } catch (err) {
    Logger.error('Get user info from facebook failure');
    Logger.error(err);
    return null;
  }
}

module.exports = {
  verifyFacebookToken,
  init,
  getUserInfo,
};
