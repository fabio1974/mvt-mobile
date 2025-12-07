// Configurações de ambiente

// Detecta se está em desenvolvimento
const __DEV__ = process.env.NODE_ENV !== 'production';

export const ENV = {
  // API - usa servidor local em DEV, produção em PROD
  API_URL: __DEV__ 
    ? 'http://192.168.18.19:8080/api'  // Servidor local
    : 'https://mvt-events-api.onrender.com/api',  // Produção
  
  // Google Maps
  GOOGLE_MAPS_API_KEY: 'AIzaSyBpJ-PEX_eQunOFbDXKLC3Xr3q69xoROmU',
  
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
