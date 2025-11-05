import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Serviço de notificações push para convites de entrega
 * Gerencia registro, recebimento e processamento de notificações
 */

interface NotificationData {
  type: 'delivery_invite' | 'delivery_update' | 'delivery_cancelled';
  deliveryId: string;
  message: string;
  data?: any;
}

interface PushTokenResponse {
  success: boolean;
  message?: string;
}

// Configuração das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private pushToken: string | null = null;
  private isInitialized = false;
  private notificationListeners: any[] = [];

  /**
   * Inicializa o serviço de notificações
   */
  async initialize(): Promise<boolean> {
    try {
      // Solicita permissões
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.warn('Permissões de notificação negadas');
        return false;
      }

      // Registra token push
      await this.registerPushToken();

      // Configura listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('✅ Serviço de notificações inicializado');
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar notificações:', error);
      return false;
    }
  }

  /**
   * Solicita permissões para notificações
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Permissão para notificações negada');
        return false;
      }

      // Configurações específicas do Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('delivery', {
          name: 'Entregas',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#e94560',
          sound: 'default',
        });
      }


      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões:', error);
      return false;
    }
  }

  /**
   * Registra token push no backend
   */
  async registerPushToken(): Promise<void> {
    try {
      let token: string;
      
      if (Platform.OS === 'web') {
        // Para web, usar Push API nativa do browser
        token = await this.generateWebPushToken();
      } else {
        // Para mobile, usar Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'mvt-mobile-delivery-system',
          applicationId: 'com.mvt.mobile.delivery'
        });
        token = tokenData.data;
      }
      
      this.pushToken = token;

      // Salva localmente
      await AsyncStorage.setItem('push_token', token);

      // Envia para o backend
      const result = await this.sendTokenToBackend(token);
      
      if (!result.success) {
        throw new Error(result.message || 'Falha ao registrar token no backend');
      }
    } catch (error) {
      console.error('Erro ao registrar token push:', error);
      throw error;
    }
  }

  /**
   * Envia token para o backend
   */
  async sendTokenToBackend(token: string): Promise<PushTokenResponse> {
    try {
      let payload: any = {
        token,
        platform: Platform.OS,
        deviceType: Platform.OS === 'web' ? 'web' : 'mobile',
      };

      // Para web, incluir dados completos da subscription
      if (Platform.OS === 'web') {
        const subscriptionData = await AsyncStorage.getItem('web_push_subscription');
        if (subscriptionData) {
          payload.subscriptionData = JSON.parse(subscriptionData);
          console.log('📡 [Web Push] Enviando subscription para backend:', {
            endpoint: payload.subscriptionData.endpoint,
            hasKeys: !!payload.subscriptionData.keys
          });
        }
      }

      console.log('📡 [Push Token] Enviando para backend...', {
        platform: payload.platform,
        deviceType: payload.deviceType,
        tokenPreview: token.substring(0, 50) + '...'
      });

      const response = await apiClient.post('/users/push-token', payload);
      
      console.log('✅ [Push Token] Token registrado no backend com sucesso!');
      
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao enviar token para backend:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao registrar token',
      };
    }
  }

  /**
   * Configura listeners para notificações
   */
  setupNotificationListeners(): void {
    // Listener para quando app está em foreground
    const foregroundListener = Notifications.addNotificationReceivedListener(
      this.handleForegroundNotification.bind(this)
    );

    // Listener para quando usuário toca na notificação
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    this.notificationListeners = [foregroundListener, responseListener];
    console.log('👂 Listeners de notificação configurados');
  }

  /**
   * Processa notificação recebida em foreground
   */
  private handleForegroundNotification(notification: Notifications.Notification): void {
    // Log apenas se for uma notificação de entrega

    const data = notification.request.content.data as unknown as NotificationData;
    
    if (data?.type === 'delivery_invite') {
      this.handleDeliveryInvite(data);
    }
  }

  /**
   * Processa resposta do usuário à notificação
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    console.log('👆 Usuário tocou na notificação:', response);

    const data = response.notification.request.content.data as unknown as NotificationData;
    
    if (data?.type === 'delivery_invite') {
      // Navegar para tela de detalhes da entrega
      this.navigateToDeliveryDetails(data.deliveryId);
    }
  }

  /**
   * Processa convite de entrega
   */
  private handleDeliveryInvite(data: NotificationData): void {
    console.log('🚚 Convite de entrega recebido:', data);
    
    // Aqui você pode:
    // 1. Mostrar modal de aceitar/rejeitar
    // 2. Reproduzir som especial
    // 3. Vibrar o dispositivo
    // 4. Atualizar estado da aplicação
    
    // Exemplo: disparar evento customizado
    // EventEmitter.emit('delivery_invite', data);
  }

  /**
   * Navega para detalhes da entrega
   */
  private navigateToDeliveryDetails(deliveryId: string): void {
    console.log(`🗺️ Navegando para entrega ${deliveryId}`);
    // Implementar navegação
    // NavigationService.navigate('DeliveryDetails', { deliveryId });
  }

  /**
   * Envia notificação local (para testes)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Imediato
      });

      console.log('📨 Notificação local enviada:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Erro ao enviar notificação local:', error);
      throw error;
    }
  }

  /**
   * Simula recebimento de convite de entrega (para testes)
   */
  async simulateDeliveryInvite(deliveryId: string): Promise<void> {
    await this.sendLocalNotification(
      '🚚 Nova Entrega Disponível!',
      'Você recebeu um convite para uma nova entrega. Toque para ver detalhes.',
      {
        type: 'delivery_invite',
        deliveryId,
        message: 'Nova entrega próxima à sua localização',
      }
    );
  }

  /**
   * Remove token push do backend (logout)
   */
  async unregisterPushToken(): Promise<void> {
    try {
      if (!this.pushToken) return;

      console.log('🗑️ Removendo token push do backend...');
      
      await apiClient.delete('/users/push-token', {
        data: { token: this.pushToken }
      });

      // Limpa dados locais
      await AsyncStorage.removeItem('push_token');
      this.pushToken = null;


    } catch (error) {
      console.error('Erro ao remover token push:', error);
    }
  }

  /**
   * Limpa listeners ao destruir o serviço
   */
  destroy(): void {
    this.notificationListeners.forEach(listener => {
      listener.remove();
    });
    this.notificationListeners = [];
    this.isInitialized = false;
    console.log('🧹 Serviço de notificações destruído');
  }

  /**
   * Gera token push para web usando Push API nativa
   */
  private async generateWebPushToken(): Promise<string> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications não são suportadas neste browser');
    }

    console.log('🔔 [Web Push] Iniciando registro de Service Worker...');

    // Registra service worker se não estiver registrado
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.log('🔔 [Web Push] Service Worker não encontrado, registrando...');
      registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ [Web Push] Service Worker registrado com sucesso:', registration);
      
      // Aguarda o Service Worker estar ativo
      await navigator.serviceWorker.ready;
      console.log('✅ [Web Push] Service Worker está pronto');
    } else {
      console.log('✅ [Web Push] Service Worker já registrado:', registration);
    }

    // Verifica permissão de notificação
    console.log('🔔 [Web Push] Solicitando permissão para notificações...');
    const permission = await Notification.requestPermission();
    console.log('🔔 [Web Push] Permissão:', permission);
    
    if (permission !== 'granted') {
      throw new Error('Permissão de notificação negada');
    }

    // Gera subscription push
    const vapidPublicKey = 'BN8ym6-oByG6GoAEC9399ciwUoal_2vh1IyGph1xS9rnF0yC5GPHfrlgE-th3JqyPPaFOqXKnfQBYVj9oS5a15k';
    
    console.log('🔔 [Web Push] Criando push subscription com VAPID key...');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    });
    
    console.log('✅ [Web Push] Push subscription criada!');
    console.log('📍 [Web Push] Endpoint:', subscription.endpoint);
    
    // Armazena a subscription completa para uso posterior
    const subscriptionData = JSON.stringify(subscription.toJSON());
    await AsyncStorage.setItem('web_push_subscription', subscriptionData);
    
    // Retorna o endpoint como token (para compatibilidade)
    return subscription.endpoint;
  }

  /**
   * Converte VAPID key de base64 para Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Verifica se o serviço está inicializado
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Obtém token push atual
   */
  getPushToken(): string | null {
    return this.pushToken;
  }
}

// Exporta instância singleton
export const notificationService = new NotificationService();
export default NotificationService;