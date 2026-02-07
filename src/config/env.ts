// Configurações de ambiente

// Detecta se está em desenvolvimento
const __DEV__ = process.env.NODE_ENV !== 'production';

export const ENV = {
  // API - apontando para backend LOCAL
  API_URL: 'http://192.168.18.75:8080/api',  // Local - IP: 192.168.18.75 (ATIVO - Atualizado)
  // API_URL: 'https://mvt-events-api.onrender.com/api',  // Produção (comentado)
  
  // Google Maps
  GOOGLE_MAPS_API_KEY: 'AIzaSyBpJ-PEX_eQunOFbDXKLC3Xr3q69xoROmU',
  
  // Firebase (Push Notifications)
  FIREBASE_PROJECT_ID: '',
  FIREBASE_MESSAGING_SENDER_ID: '',
  
  // App Version??





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
