import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { PaymentNotificationData, PaymentNotificationType } from '../types/payment';

/**
 * Hook para lidar com notificações de pagamento (push notifications)
 * 
 * Tipos de notificação suportados:
 * - PAYMENT_SUCCESS: Pagamento aprovado (cartão)
 * - PAYMENT_FAILED: Pagamento falhou (cartão)
 * - PIX_REQUIRED: Cliente precisa pagar PIX (com QR Code)
 * - PIX_CONFIRMED: Pagamento PIX confirmado
 * 
 * @param onPixRequired - Callback quando recebe PIX_REQUIRED (abre tela de pagamento)
 * @param onPaymentSuccess - Callback quando pagamento é aprovado
 * @param onPaymentFailed - Callback quando pagamento falha
 * @param onPixConfirmed - Callback quando PIX é confirmado
 */
export const usePaymentPushNotifications = (callbacks: {
  onPixRequired?: (pixInfo: any) => void;
  onPaymentSuccess?: (deliveryId: string, amount: number) => void;
  onPaymentFailed?: (deliveryId: string, error: string) => void;
  onPixConfirmed?: (deliveryId: string) => void;
}) => {
  const {
    onPixRequired,
    onPaymentSuccess,
    onPaymentFailed,
    onPixConfirmed,
  } = callbacks;

  // Refs para manter callbacks atualizados
  const onPixRequiredRef = useRef(onPixRequired);
  const onPaymentSuccessRef = useRef(onPaymentSuccess);
  const onPaymentFailedRef = useRef(onPaymentFailed);
  const onPixConfirmedRef = useRef(onPixConfirmed);

  useEffect(() => {
    onPixRequiredRef.current = onPixRequired;
    onPaymentSuccessRef.current = onPaymentSuccess;
    onPaymentFailedRef.current = onPaymentFailed;
    onPixConfirmedRef.current = onPixConfirmed;
  }, [onPixRequired, onPaymentSuccess, onPaymentFailed, onPixConfirmed]);

  useEffect(() => {
    console.log('🔔 [usePaymentPushNotifications] Registrando listeners de pagamento...');

    // Listener para notificações recebidas (app em foreground)
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 [Payment] Notificação recebida (foreground):', notification);
        handlePaymentNotification(notification.request.content.data);
      }
    );

    // Listener para quando usuário interage com notificação
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 [Payment] Usuário interagiu com notificação:', response);
        handlePaymentNotification(response.notification.request.content.data);
      }
    );

    return () => {
      console.log('🔕 [usePaymentPushNotifications] Removendo listeners de pagamento');
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const handlePaymentNotification = (data: any) => {
    console.log('🔄 [handlePaymentNotification] Processando:', data);

    if (!data || !data.type) {
      console.warn('⚠️ Notificação sem tipo definido');
      return;
    }

    const notificationType = data.type as PaymentNotificationType;
    const deliveryId = data.deliveryId;

    switch (notificationType) {
      case 'PIX_REQUIRED':
        console.log('💰 PIX_REQUIRED recebido');
        if (onPixRequiredRef.current && data.pixInfo) {
          onPixRequiredRef.current(data.pixInfo);
        } else {
          // Fallback: mostrar alerta se não tem callback
          Alert.alert(
            '💰 Pagamento PIX Necessário',
            'Você precisa realizar o pagamento PIX para esta entrega. Abra a notificação para ver o QR Code.',
            [{ text: 'OK' }]
          );
        }
        break;

      case 'PAYMENT_SUCCESS':
        console.log('✅ PAYMENT_SUCCESS recebido');
        if (onPaymentSuccessRef.current) {
          onPaymentSuccessRef.current(deliveryId, data.amount || 0);
        }
        Alert.alert(
          '✅ Pagamento Aprovado!',
          data.message || 'Seu pagamento foi processado com sucesso.',
          [{ text: 'OK' }]
        );
        break;

      case 'PAYMENT_FAILED':
        console.log('❌ PAYMENT_FAILED recebido');
        if (onPaymentFailedRef.current) {
          onPaymentFailedRef.current(
            deliveryId,
            data.errorMessage || 'Erro ao processar pagamento'
          );
        }
        Alert.alert(
          '❌ Pagamento Recusado',
          data.errorMessage || 
            'Não foi possível processar o pagamento. Verifique seus dados de pagamento nas configurações.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Ver Configurações', onPress: () => {
              // TODO: Navegar para PaymentPreferenceScreen
              console.log('📱 Navegar para configurações de pagamento');
            }}
          ]
        );
        break;

      case 'PIX_CONFIRMED':
        console.log('✅ PIX_CONFIRMED recebido');
        if (onPixConfirmedRef.current) {
          onPixConfirmedRef.current(deliveryId);
        }
        Alert.alert(
          '✅ PIX Confirmado!',
          data.message || 'Seu pagamento PIX foi confirmado com sucesso.',
          [{ text: 'OK' }]
        );
        break;

      default:
        console.warn('⚠️ Tipo de notificação de pagamento desconhecido:', notificationType);
    }
  };

  return {
    // Retorna função para processar manualmente se necessário
    handlePaymentNotification,
  };
};
