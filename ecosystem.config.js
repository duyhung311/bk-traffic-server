module.exports = {
  apps: [{
    name: 'BKTrafficApi',
    script: './bin/www',

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    args: '',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
      APP_NAME: 'BKTraffic',
      PORT: '3123',
      HOST: 'https://api.bktraffic.com',
      IMAGE_HOST: 'https://api.bktraffic.com',
      DATABASE_URI: 'mongodb://bktraffic:v%5B%21WH7BZbL7%7EL5y.@api.bktraffic.com:27017/bktraffic',
      BKTRAFFIC_ANALYXER: 'https://api.bktraffic.click',
      FACEBOOK_APP_ID: '1592356364232559',
      FACEBOOK_APP_SECRET: '80dd8a81fb45b2616ad1e77205647866',
      DEFAULT_ADMIN_USERNAME: 'admin',
      DEFAULT_ADMIN_PASSWORD: '@admin',
      APP_SECRET_KEY: 'bktraffic-2019',
      MAIL_USERNAME: 'khanhtran.cse@gmail.com',
      MAIL_CLIEND_ID: '587371830146-s6ttgomn3ijs4khpdeaoesd91jpnl961.apps.googleusercontent.com',
      MAIL_CLIEND_SECRET: 'hoMQXKgZOc2x5CZc9cjrG6bm',
      MAIL_REFRESH_TOKEN: '1/alrEtucpCDYVqv0KeCnLW8-GyXDrtFctgfuTt8R-r9U',
      GROUP_PER_PAGE: '20',
      GOOGLE_CLIENT_ID: '131064076267-odh7iamsigsts5tbo9qdm9fjs7bdca03.apps.googleusercontent.com',
      GOOGLE_CLIENT_ID_2: '131064076267-e9r50dikvdfqil0s11ocjbu238kofouc.apps.googleusercontent.com',
      GOOGLE_CLIENT_ID_3: '131064076267-l5mfjlktr38bqu935n32ima5u7vu5b2d.apps.googleusercontent.com',
      GOOGLE_CLIENT_ID_4: '131064076267-47lvssk4a0359tap67d058m87pugvo3i.apps.googleusercontent.com',
      CALCULATE_SERVER: 'http://localhost:3124/update-setting',
      DOLBY_API_KEY: 'xFCkf0XXsADpSAAPvfAbfYxA2XQacHlp',
      IMGBUCKET: 'licenseImg',
      API_KEY_APIMEDIC: 'o4S7Z_HCMUT_EDU_VN_AUT',
      SECRET_KEY_APIMEDIC: 'r9RPg68Aqo7W2LaXc',
      MICROSOFT_TRANSLATOR_KEY: 'b168bdb71emsh1f25ba2ebde431dp13fcc7jsn81ec5cb7f75d'
    },
  }],

  deploy: {
    production: {
      user: 'node',
      host: '212.83.163.1',
      ref: 'origin/master',
      repo: 'git@github.com:repo.git',
      path: '/var/www/production',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
    },
  },
};
