import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Clipboard,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { PixPaymentInfo } from '../types/payment';

interface PixPaymentScreenProps {
  pixInfo: PixPaymentInfo;
  onBack: () => void;
  onPaymentConfirmed?: () => void;
}

/**
 * Tela de pagamento PIX
 * Mostra QR Code, chave PIX copiável e timer de expiração
 * O backend envia push notification quando PIX é confirmado
 */
const PixPaymentScreen: React.FC<PixPaymentScreenProps> = ({
  pixInfo,
  onBack,
  onPaymentConfirmed,
}) => {
  const insets = useSafeAreaInsets();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isCopied, setIsCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Calcula tempo restante
    const expiresAt = new Date(pixInfo.expiresAt).getTime();
    const now = Date.now();
    const remainingMs = expiresAt - now;

    if (remainingMs <= 0) {
      Alert.alert(
        '⏱️ Tempo Expirado',
        'O tempo para pagamento expirou. Por favor, solicite uma nova entrega.',
        [{ text: 'OK', onPress: onBack }]
      );
      return;
    }

    setTimeRemaining(Math.floor(remainingMs / 1000));

    // Timer para atualizar contador
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          Alert.alert(
            '⏱️ Tempo Expirado',
            'O tempo para pagamento expirou. Por favor, solicite uma nova entrega.',
            [{ text: 'OK', onPress: onBack }]
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pixInfo.expiresAt, onBack]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAmount = (cents: number): string => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleCopyPixKey = async () => {
    try {
      await Clipboard.setString(pixInfo.qrCode);
      setIsCopied(true);
      Alert.alert('✅ Copiado!', 'Código PIX copiado para a área de transferência');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      Alert.alert('Erro', 'Não foi possível copiar o código');
    }
  };

  const handleSharePixKey = async () => {
    try {
      await Share.share({
        message: `Código PIX: ${pixInfo.qrCode}`,
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const isExpiring = timeRemaining <= 60; // Último minuto

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento PIX</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {/* Timer */}
        <View style={[styles.timerBox, isExpiring && styles.timerBoxExpiring]}>
          <Ionicons 
            name={isExpiring ? "warning" : "time-outline"} 
            size={24} 
            color={isExpiring ? "#dc2626" : "#3b82f6"} 
          />
          <Text style={[styles.timerText, isExpiring && styles.timerTextExpiring]}>
            Tempo restante: {formatTime(timeRemaining)}
          </Text>
        </View>

        {/* Valor */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Valor a pagar</Text>
          <Text style={styles.amountValue}>{formatAmount(pixInfo.amount)}</Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrCodeContainer}>
          <View style={styles.qrCodeBox}>
            {pixInfo.qrCodeBase64 ? (
              <QRCode
                value={pixInfo.qrCode}
                size={220}
                backgroundColor="white"
              />
            ) : (
              <ActivityIndicator size="large" color="#0f0f23" />
            )}
          </View>
          <Text style={styles.qrCodeHint}>
            Escaneie o QR Code com o app do seu banco
          </Text>
        </View>

        {/* Chave PIX copiável */}
        <View style={styles.pixKeySection}>
          <Text style={styles.pixKeyLabel}>Ou copie o código PIX:</Text>
          <View style={styles.pixKeyBox}>
            <Text style={styles.pixKeyText} numberOfLines={2}>
              {pixInfo.qrCode.substring(0, 50)}...
            </Text>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.buttonPrimary, isCopied && styles.buttonSuccess]}
              onPress={handleCopyPixKey}
            >
              <Ionicons 
                name={isCopied ? "checkmark-circle" : "copy-outline"} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.buttonText}>
                {isCopied ? 'Copiado!' : 'Copiar Código'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleSharePixKey}
            >
              <Ionicons name="share-outline" size={20} color="#0f0f23" />
              <Text style={styles.buttonTextSecondary}>Compartilhar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Instruções */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>📱 Como pagar:</Text>
          <Text style={styles.instructionItem}>1. Abra o app do seu banco</Text>
          <Text style={styles.instructionItem}>2. Escaneie o QR Code ou cole o código</Text>
          <Text style={styles.instructionItem}>3. Confirme o pagamento</Text>
          <Text style={styles.instructionItem}>
            4. Você receberá uma notificação quando o pagamento for confirmado
          </Text>
        </View>

        {/* Info sobre confirmação automática */}
        <View style={styles.autoConfirmBox}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
          <Text style={styles.autoConfirmText}>
            A confirmação é automática. Não feche esta tela até pagar.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f0f23',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  timerBoxExpiring: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginLeft: 8,
  },
  timerTextExpiring: {
    color: '#dc2626',
  },
  amountBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0f0f23',
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrCodeBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrCodeHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  pixKeySection: {
    marginBottom: 24,
  },
  pixKeyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pixKeyBox: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 12,
  },
  pixKeyText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#0f0f23',
  },
  buttonSuccess: {
    backgroundColor: '#10b981',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0f0f23',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#0f0f23',
    fontSize: 15,
    fontWeight: '600',
  },
  instructionsBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  instructionItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  autoConfirmBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  autoConfirmText: {
    flex: 1,
    fontSize: 13,
    color: '#065f46',
    lineHeight: 18,
  },
});

export default PixPaymentScreen;
