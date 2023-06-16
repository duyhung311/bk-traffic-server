# 2. Installation

The server was written and tested on the following environment:
- NodeJS version v12.18.0
- MongoDB version v4.2.7
- *nix Operating Systems (Linux or MacOS)

To run server, do the following steps:

1. Create a `.env` file that define environment variables. For more detail, see [ENVIRONMENT](#environment) session.
2. Install all dependencies by running command:
``` npm install``` or ```yarn install```
3. Start MongoDB Database Server in either options:
  - Local
  - Docker: ```docker-compose -f docker-compose-mongo.yml up```
4. Start server by running command: ```npm start``` or ```yarn start```


## Environment Variables of API Server

The server supports following environment variables:

| Name | Default | Description |
| - | - | - |
|NODE_ENV|development| Server mode, use `development` for testing purpose and `production` for production |
|APP_NAME| None | The name of system. This name will display for user|
|PORT|3000| The port of server|
|HOST|http://localhost:3000| The host of server|
|IMAGE_HOST|http://localhost:3000|The host of server that was used to upload images|
|DATABASE_URI|mongodb://localhost:27017/bktraffic| Database connection|
|FACEBOOK_APP_ID|None|Id of Fb App. Use to login with Facebook|
|FACEBOOK_APP_SECRET|None|Secret key of Fb App. Use to login with Facebook|
|DEFAULT_ADMIN_USERNAME|admin1|The username of admin|
|DEFAULT_ADMIN_PASSWORD|@admin|The password of admin|
|APP_SECRET_KEY| None| The key use for encrypting token |
|MAIL_USERNAME|None| Email that was used for send notification or verification|
|MAIL_CLIENT_ID|None| Email that was used for send notification or verification|
|MAIL_CLIENT_SECRET|None| Email that was used for send notification or verification|
|MAIL_REFRESH_TOKEN|None| Email that was used for send notification or verification|
|GROUP_PER_PAGE|20|Default pagination size|
|GOOGLE_CLIENT_ID| None | Use for login with Google
|CALCULATE_SERVER|http://localhost:3124/update-setting|| 

For quick, you can make a copy of `.env.example` and rename to `.env`. Then edit it to suit your environment.

## Environment Variables of Updater Server

The server supports following environment variables:

| Name | Default | Description |
| - | - | - |
|NODE_ENV|development| Server mode, use `development` for testing purpose and `production` for production |
|APP_NAME| None | The name of system. This name will display for user|
|PORT|3000| The port of server|
|HOST|http://localhost:3000| The host of server|
|DATABASE_URI|mongodb://localhost:27017/bktraffic| Database connection|
|APP_SECRET_KEY| None| The key use for encrypting token |

For quick, you can make a copy of `.env.example` and rename to `.env`. Then edit it to suit your environment.
