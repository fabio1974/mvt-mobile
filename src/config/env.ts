// Configurações de ambiente

export const ENV = {
  // API
  API_URL: __DEV__ 
    ? 'http://localhost:8080/api' 
    : 'https://api.mvt.com.br/api',
  
  // Google Maps
  GOOGLE_MAPS_API_KEY: '', // Adicionar sua chave aqui
  
  // Firebase (Push Notifications)
  FIREBASE_PROJECT_ID: '',
  FIREBASE_MESSAGING_SENDER_ID: '',
  
  // App Version
  APP_VERSION: '1.0.0',
  
  // Features Flags
  FEATURES: {
    GPS_TRACKING: true,
    PUSH_NOTIFICATIONS: true,
    OFFLINE_MODE: true,
    PHOTO_CAPTURE: true,
  },
  
  // Configurações de GPS
  GPS: {
    UPDATE_INTERVAL: 5000, // 5 segundos
    MIN_DISTANCE: 10, // 10 metros
    HIGH_ACCURACY: true,
  },
};

export default ENV;
