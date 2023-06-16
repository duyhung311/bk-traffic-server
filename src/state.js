const state = {
  SEARCH_DISTANCE: 20,
  NUMBER_OF_SEGMENT_RESULT: 2,
  EARTH_CIRCUMFERENCE: 40075000,
  EARTH_RADIUS: 6371000,
  AVERAGE_VELOCITY: 30, // km/h
  KMPERHOUR_TO_MPERSECOND_CONST: 5 / 18,
  MAX_CAPACITY: 20,
  NUMBER_OF_SCRIPTS: 10,

  updateStatusIntervalRefKey: 'update-status-interval', // use for sync with database
  updateStatusInterval: 300000, // ms

  notificationMaxInactiveKey: 'notification-max-inactive-key',
  notificationMaxInactiveTime: 60000, // ms
  admin: {
    username: 'admin1',
    password: '@admin',
    name: 'Admin',
  },
  sources: ['AD', 'GPS', 'VOH', 'user'],
  speeds_voh: {
    '5e11c1a32a1900178fc2e807': 5,
    '5e11c27ddc91f5178fa18220': 15,
    '5e11c280dc91f5178fa18221': 25,
    '5e11c283dc91f5178fa18222': 35,
    '5e11c286dc91f5178fa18223': 40,
  },
  ignore_district: ['dong_nai', 'huyen_nha_be', 'binh_duong', 'huyen_cu_chi', 'long_an', 'huyen_hoc_mon'],
};

module.exports = state;
