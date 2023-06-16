const admin = require('firebase-admin');
const serviceAccount = require('../config/utraffic-firebase-adminsdk-lyfwb-652db58612.json');
const Logger = require('./logger');

function init() {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://utraffic.firebaseio.com',
  });
}

function sendMessageToDevice(message, deviceToken) {
  const fcmMessage = {
    notification: message,
    token: deviceToken,
  };
  return admin.messaging().send(fcmMessage)
    .then((response) => {
      // Response is a message ID string.
      Logger.info('Successfully sent message:', response);
    })
    .catch((error) => {
      Logger.error('Error sending message:', error);
    });
}

function sendDataNotificationToDevice(data, deviceToken) {
  const fcmMessage = {
    data,
    token: deviceToken,
  };
  return admin.messaging().send(fcmMessage)
    .then((response) => {
      // Response is a message ID string.
      Logger.info('Successfully sent message:', response);
    })
    .catch((error) => {
      Logger.error('Error sending message:', error);
    });
}

module.exports = {
  init,
  sendMessageToDevice,
  sendDataNotificationToDevice,
};
