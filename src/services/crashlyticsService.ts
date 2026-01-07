import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';

class CrashlyticsService {
  async initialize() {
    try {
      // Só inicializa em build nativo (não funciona no Expo Go)
      if (Platform.OS === 'web' || __DEV__) {
        console.log('⚠️ Crashlytics desabilitado em desenvolvimento/web');
        return;
      }
      
      // Habilita coleta automática de crashes
      await crashlytics().setCrashlyticsCollectionEnabled(true);
      console.log('✅ Firebase Crashlytics inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar Crashlytics:', error);
    }
  }

  // Log de erro não-fatal
  recordError(error: Error, context?: string) {
    try {
      if (context) {
        crashlytics().log(`Context: ${context}`);
      }
      crashlytics().recordError(error);
      console.log('📊 Erro registrado no Crashlytics:', error.message);
    } catch (e) {
      console.error('❌ Erro ao registrar no Crashlytics:', e);
    }
  }

  // Define usuário para rastrear crashes por usuário
  setUser(userId: string, email?: string, name?: string) {
    try {
      crashlytics().setUserId(userId);
      if (email) {
        crashlytics().setAttribute('email', email);
      }
      if (name) {
        crashlytics().setAttribute('name', name);
      }
      console.log('👤 Usuário definido no Crashlytics:', userId);
    } catch (error) {
      console.error('❌ Erro ao definir usuário no Crashlytics:', error);
    }
  }

  // Adiciona atributo customizado
  setAttribute(key: string, value: string) {
    try {
      crashlytics().setAttribute(key, value);
    } catch (error) {
      console.error('❌ Erro ao adicionar atributo:', error);
    }
  }

  // Log customizado
  log(message: string) {
    try {
      crashlytics().log(message);
    } catch (error) {
      console.error('❌ Erro ao adicionar log:', error);
    }
  }

  // Força um crash para testar (apenas para desenvolvimento)
  testCrash() {
    crashlytics().crash();
  }
}

export const crashlyticsService = new CrashlyticsService();
