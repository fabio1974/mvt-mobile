import * as Notifications from 'expo-notifications';
import { Platform, Alert, AppState } from 'react-native';
import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Serviço de notificações push para convites de entrega
 * Gerencia registro, recebimento e processamento de notificações
 */

export interface NotificationData {
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
  handleNotification: async (notification) => {
    console.log('========================================');
    console.log('🔔🔔🔔 HANDLER DISPARADO! 🔔🔔🔔');
    console.log('========================================');
    console.log('📬 Notificação completa:', JSON.stringify(notification, null, 2));
    console.log('📝 Title:', notification.request.content.title);
    console.log('📝 Body:', notification.request.content.body);
    console.log('📝 Data:', JSON.stringify(notification.request.content.data, null, 2));
    console.log('========================================');
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

class NotificationService {
  private pushToken: string | null = null;
  private isInitialized = false;
  private notificationListeners: any[] = [];
  private onDeliveryInviteCallback: ((data: NotificationData) => void) | null = null;

  /**
   * Registra callback para quando receber convite de entrega
   */
  setOnDeliveryInvite(callback: (data: NotificationData) => void): void {
    this.onDeliveryInviteCallback = callback;
    console.log('✅ Callback de delivery invite registrado');
  }

  /**
   * Inicializa o serviço de notificações
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('========================================');
      console.log('🚀 INICIALIZANDO NOTIFICATION SERVICE');
      console.log('📱 App State:', AppState.currentState);
      console.log('📱 Platform:', Platform.OS);
      console.log('========================================');
      
      // Valida se o token mudou (pode acontecer em update de SO/app)
      if (Platform.OS !== 'web') {
        const hasTokenChanged = await this.validateTokenChange();
        if (hasTokenChanged) {
          console.warn('⚠️ Token Expo mudou! Re-registrado com sucesso');
        }
      }
      
      // Solicita permissões
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.warn('⚠️ Permissões de notificação negadas');
        return false;
      }

      // Registra token push
      try {
        await this.registerPushToken();
      } catch (error: any) {
        // Se falhar ao registrar token (ex: falta projectId), continua sem push
        console.warn('⚠️ Push notifications desabilitadas:', error.message);
        console.warn('⚠️ O app funcionará normalmente, mas sem notificações push remotas');
        console.warn('⚠️ Para habilitar: Crie um projeto no Expo e adicione projectId ao app.json');
        // NÃO lança erro, apenas continua
      }

      // Configura listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('✅ Serviço de notificações inicializado (notificações locais disponíveis)');
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
        // Para mobile (Expo Go ou Build), obtém token do Expo
        console.log('📱 ==========================================');
        console.log('📱 Solicitando token do Expo Push...');
        console.log('📱 Platform:', Platform.OS);
        console.log('📱 __DEV__:', __DEV__);
        console.log('📱 Project ID: d4a3b53e-0dbc-48c1-a865-cf9eff2dd52c');
        console.log('📱 ==========================================');
        
        // Usa projectId real do Expo
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'd4a3b53e-0dbc-48c1-a865-cf9eff2dd52c'
        });
        token = tokenData.data;
        
        console.log('✅ ==========================================');
        console.log('✅ Token Expo REAL obtido com sucesso!');
        console.log('✅ Tipo:', token.substring(0, 20) + '...');
        console.log('✅ Token completo:', token);
        console.log('✅ É ExponentPushToken?', token.startsWith('ExponentPushToken'));
        console.log('✅ É ExpoToken?', token.startsWith('ExpoToken'));
        console.log('✅ ==========================================');
      }
      
      this.pushToken = token;

      // Salva localmente
      await AsyncStorage.setItem('push_token', token);
      await AsyncStorage.setItem('push_token_timestamp', Date.now().toString());

      console.log('📤 Enviando token REAL para backend...');

      // Envia para o backend
      const result = await this.sendTokenToBackend(token);
      
      if (!result.success) {
        throw new Error(result.message || 'Falha ao registrar token no backend');
      }
      
      console.log('✅ ==========================================');
      console.log('✅ Token REAL registrado no backend!');
      console.log('✅ ==========================================');
    } catch (error: any) {
      console.error('❌ ==========================================');
      console.error('❌ ERRO CRÍTICO ao registrar token push!');
      console.error('❌ Erro:', error);
      console.error('❌ Mensagem:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ==========================================');
      throw error;
    }
  }

  /**
   * Valida se o token Expo mudou desde a última inicialização
   * Isso pode acontecer quando o SO é atualizado ou app é reinstalado parcialmente
   */
  private async validateTokenChange(): Promise<boolean> {
    try {
      // Obtém o token anterior salvo
      const savedToken = await AsyncStorage.getItem('push_token');
      
      // Se não há token salvo, é a primeira vez
      if (!savedToken) {
        console.log('📱 [Token Validation] Primeira inicialização - sem token anterior');
        return false;
      }
      
      // Obtém o token atual do Expo
      const currentTokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'd4a3b53e-0dbc-48c1-a865-cf9eff2dd52c'
      });
      const currentToken = currentTokenData.data;
      
      // Compara tokens
      if (currentToken !== savedToken) {
        console.error('❌ ==========================================');
        console.error('❌ TOKEN EXPO MUDOU!');
        console.error('❌ Anterior:', savedToken.substring(0, 30) + '...');
        console.error('❌ Atual:   ', currentToken.substring(0, 30) + '...');
        console.error('❌ ==========================================');
        
        // Força re-registro do novo token
        await this.registerPushToken();
        
        return true; // Token mudou e foi re-registrado
      }
      
      // Token continua o mesmo
      const savedTimestamp = await AsyncStorage.getItem('push_token_timestamp');
      const daysSinceLastCheck = savedTimestamp 
        ? Math.floor((Date.now() - parseInt(savedTimestamp)) / (1000 * 60 * 60 * 24))
        : 'desconhecido';
      
      console.log('✅ [Token Validation] Token válido e inalterado (último check: ' + daysSinceLastCheck + ' dias atrás)');
      return false; // Token não mudou
    } catch (error) {
      console.error('❌ [Token Validation] Erro ao validar token:', error);
      // Em caso de erro, continua normalmente (não falha a inicialização)
      return false;
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

      console.log('📡 =============== ENVIANDO TOKEN PUSH PARA SEU BACKEND ===============');
      console.log('📤 URL:', apiClient.getBaseURL() + '/users/push-token');
      console.log('📦 Payload:', JSON.stringify(payload, null, 2));
      console.log('🔑 Token Preview:', token.substring(0, 50) + '...');
      console.log('📱 Platform:', payload.platform);
      console.log('💻 Device Type:', payload.deviceType);
      console.log('===================================================================\n');

      const response = await apiClient.post('/users/push-token', payload);
      
      console.log('✅ [Push Token] Token registrado no backend com sucesso!');
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ [Push Token] Falha ao registrar token no SEU backend');
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
    console.log('========================================');
    console.log('🎧 CONFIGURANDO NOTIFICATION LISTENERS');
    console.log('========================================');
    
    // Listener para quando app está em foreground
    console.log('🔧 Criando foreground listener...');
    const foregroundListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('🔔🔔🔔 LISTENER CHAMADO! 🔔🔔🔔');
        this.handleForegroundNotification(notification);
      }
    );
    console.log('✅ Foreground listener registrado:', foregroundListener);

    // Listener para quando usuário toca na notificação
    console.log('🔧 Criando response listener...');
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆👆👆 RESPONSE LISTENER CHAMADO! 👆👆👆');
        this.handleNotificationResponse(response);
      }
    );
    console.log('✅ Response listener registrado:', responseListener);

    this.notificationListeners = [foregroundListener, responseListener];
    console.log('👂 Listeners de notificação configurados e salvos');
    console.log('📊 Total de listeners:', this.notificationListeners.length);
    console.log('========================================');
  }

  /**
   * Processa notificação recebida em foreground
   */
  private handleForegroundNotification(notification: Notifications.Notification): void {
    console.log('========================================');
    console.log('📬 FOREGROUND NOTIFICATION RECEIVED!');
    console.log('========================================');

    let data = notification.request.content.data as any;
    const title = notification.request.content.title || 'Nova Notificação';
    const body = notification.request.content.body || '';
    
    console.log('📝 Título:', title);
    console.log('📝 Corpo:', body);
    console.log('📝 Data:', JSON.stringify(data, null, 2));

    // Expo Push API pode enviar data como JSON string no campo body
    // Precisamos parsear para obter type e deliveryId
    if (data?.body && typeof data.body === 'string') {
      try {
        const bodyData = JSON.parse(data.body);
        data = { ...data, ...bodyData };
        console.log('📦 Data parseado do body JSON:', data);
      } catch (e) {
        // Não é JSON, ignora
      }
    }
    
    // Se é convite de entrega, chama o callback DIRETAMENTE (abre o modal)
    if (data?.type === 'delivery_invite') {
      console.log('🚚 Tipo: delivery_invite - CHAMANDO CALLBACK DIRETAMENTE');
      this.handleDeliveryInvite(data as NotificationData);
      console.log('✅ Callback de delivery invite executado');
    } else {
      // Para outros tipos, mostra alert
      console.log('📌 Tipo genérico - Mostrando alert simples');
      Alert.alert(title, body, [{ 
        text: 'OK',
        onPress: () => console.log('✅ Alert OK pressionado')
      }]);
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
    
    // Se há callback registrado, chama ele (MainApp vai abrir o modal)
    if (this.onDeliveryInviteCallback) {
      console.log('📲 Chamando callback de delivery invite');
      this.onDeliveryInviteCallback(data);
    } else {
      console.warn('⚠️ Nenhum callback registrado para delivery invite');
    }
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
   * Simula recebimento direto de notificação (chama o callback)
   * Útil para testar o fluxo sem depender do sistema de notificações
   */
  simulateDirectDeliveryInvite(deliveryId: string): void {
    console.log('🧪 Simulando recebimento DIRETO de notificação');
    
    const testData: NotificationData = {
      type: 'delivery_invite',
      deliveryId: deliveryId,
      message: 'Nova entrega disponível!',
      data: {
        pickup: 'Rua A, 123 - Ubajara',
        dropoff: 'Rua B, 456 - Ubajara',
        distance: '2.5 km',
        payment: 'R$ 15,00'
      }
    };
    
    console.log('📦 Dados simulados:', testData);
    
    // Chama o handler diretamente
    this.handleDeliveryInvite(testData);
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