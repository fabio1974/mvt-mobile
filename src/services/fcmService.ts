import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api';

class FCMService {
  private fcmToken: string | null = null;
  private onMessageCallback: ((message: any) => void) | null = null;

  /**
   * Solicita permissão para notificações (iOS principalmente)
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.warn('⚠️ Permissão de notificação negada');
          return false;
        }
      }

      console.log('✅ Permissão de notificação concedida');
      return true;
    } catch (error) {
      console.error('❌ Erro ao solicitar permissão:', error);
      return false;
    }
  }

  /**
   * Obtém o token FCM
   */
  async getToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return null;
      }

      const token = await messaging().getToken();
      console.log('📱 FCM Token:', token);
      
      this.fcmToken = token;
      await AsyncStorage.setItem('fcm_token', token);
      
      return token;
    } catch (error) {
      console.error('❌ Erro ao obter FCM token:', error);
      return null;
    }
  }

  /**
   * Envia o token para o backend
   */
  async sendTokenToBackend(userId: string): Promise<void> {
    try {
      if (!this.fcmToken) {
        const token = await this.getToken();
        if (!token) {
          console.warn('⚠️ Sem FCM token para enviar');
          return;
        }
      }

      console.log('📤 Enviando FCM token para backend...');
      await apiClient.post('/users/push-token', {
        userId,
        pushToken: this.fcmToken,
        platform: Platform.OS,
        tokenType: 'fcm'
      });

      console.log('✅ FCM token enviado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao enviar token:', error);
    }
  }

  /**
   * Configura listeners para notificações
   */
  setupNotificationListeners(onMessage: (message: any) => void): void {
    this.onMessageCallback = onMessage;

    // Foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('📩 Mensagem recebida em foreground:', remoteMessage);
      if (this.onMessageCallback) {
        this.onMessageCallback(remoteMessage);
      }
    });

    // Background/Quit state messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('📩 Mensagem recebida em background:', remoteMessage);
      // Processar notificação em background
    });

    // Notification opened app
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('🔔 Notificação abriu o app:', remoteMessage);
      if (this.onMessageCallback) {
        this.onMessageCallback(remoteMessage);
      }
    });

    // Check if notification opened app from quit state
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🔔 App aberto via notificação:', remoteMessage);
          if (this.onMessageCallback) {
            this.onMessageCallback(remoteMessage);
          }
        }
      });

    // Token refresh
    messaging().onTokenRefresh(async token => {
      console.log('🔄 FCM Token atualizado:', token);
      this.fcmToken = token;
      await AsyncStorage.setItem('fcm_token', token);
    });
  }

  /**
   * Subscreve a um tópico
   */
  async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`✅ Subscrito ao tópico: ${topic}`);
    } catch (error) {
      console.error(`❌ Erro ao subscrever ao tópico ${topic}:`, error);
    }
  }

  /**
   * Desinscreve de um tópico
   */
  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`✅ Desinscrito do tópico: ${topic}`);
    } catch (error) {
      console.error(`❌ Erro ao desinscrever do tópico ${topic}:`, error);
    }
  }

  /**
   * Limpa o token armazenado
   */
  async clearToken(): Promise<void> {
    try {
      await messaging().deleteToken();
      await AsyncStorage.removeItem('fcm_token');
      this.fcmToken = null;
      console.log('✅ FCM token limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar token:', error);
    }
  }
}

export const fcmService = new FCMService();
