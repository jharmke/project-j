const appConfig = require('./app.json');

module.exports = {
  ...appConfig,
  expo: {
    ...appConfig.expo,
    ios: {
      ...appConfig.expo.ios,
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
    },
  },
};
