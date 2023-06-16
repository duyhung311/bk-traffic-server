const path = require('path');

const AVATAR_BASE_LINK = '/public/avatar';
const AVATAR_BASE_PATH = path.join(__dirname, `../..${AVATAR_BASE_LINK}`);

const UPLOAD_FILE_LINK = '/public/files';
const UPLOAD_FILE_PATH = path.join(__dirname, `../..${UPLOAD_FILE_LINK}`);

const level1 = ['motorway', 'trunk'];
const level2 = ['primary'];
const level3 = [
  ...level1,
  ...level2,
  'secondary',
  'primary_link',
  'secondary_link',
  'motorway_link',
  'trunk_link',
];
const level4 = [...level3, 'tertiary', 'tertiary_link', 'unclassified'];

module.exports = {
  AVATAR_BASE_LINK,
  AVATAR_BASE_PATH,
  UPLOAD_FILE_LINK,
  UPLOAD_FILE_PATH,
  IMAGE_HOST: process.env.IMAGE_HOST || '',
  getStreetTypesByLevel: (level) => {
    if (level === 1) {
      return level1;
    } if (level === 2) {
      return level2;
    } if (level === 3) {
      return level3;
    }
    return level4;
  },
  getStreetTypesByDistance: (distance) => {
    if (distance > 12000) {
      return level2;
    } if (distance >= 8000) {
      return level2;
    } if (distance >= 5000) {
      return level3;
    }
    return level4;
  },
  getStreetLevelByDistance: (distance) => {
    if (distance > 12000) {
      return 2;
    } if (distance >= 8000) {
      return 2;
    } if (distance >= 5000) {
      return 3;
    }
    return 4;
  },
  getStreetLevelByZoomLevel: (zoomLevel) => {
    if (zoomLevel <= 12) {
      return 1;
    } if (zoomLevel <= 14) {
      return 2;
    } if (zoomLevel <= 15) {
      return 3;
    }
    return 4;
  },
  maxTimeBetweenTwoPaths: 5 * 60000,
  streetTypesByLevel: {
    1: level1,
    2: level2,
    3: level3,
    4: level4,
  },
  currentPeriod: null,
};
