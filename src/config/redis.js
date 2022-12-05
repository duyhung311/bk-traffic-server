const local = {
  host: 'http://localhost',
  port: 6379,
};

const cloud = {
  socket: {
    host: 'redis-14878.c98.us-east-1-4.ec2.cloud.redislabs.com',
    port: 14878,
  },
  password: 'y1usvla8fsdGfUnR3t9A1sW0xmbMWl6v', // Should use environment variable
};

module.exports = {
  local,
  cloud,
};
