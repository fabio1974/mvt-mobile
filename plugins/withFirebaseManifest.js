const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin to fix Firebase Messaging manifest conflicts
 * Adds tools:replace to notification color meta-data
 */
module.exports = function withFirebaseManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    if (mainApplication['meta-data']) {
      mainApplication['meta-data'].forEach((metaData) => {
        // Fix Firebase notification color conflict
        if (metaData.$['android:name'] === 'com.google.firebase.messaging.default_notification_color') {
          metaData.$['tools:replace'] = 'android:resource';
        }
        // Fix Firebase notification icon conflict (just in case)
        if (metaData.$['android:name'] === 'com.google.firebase.messaging.default_notification_icon') {
          metaData.$['tools:replace'] = 'android:resource';
        }
      });
    }
    
    return config;
  });
};
