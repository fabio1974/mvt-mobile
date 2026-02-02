import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { paymentService } from '../services/paymentService';
import { PaymentMethodType, CreditCard } from '../types/payment';

interface PaymentMethodsScreenProps {
  userId: string;
  onBack: () => void;
  onManageCards: () => void;
}

const PaymentMethodsScreen: React.FC<PaymentMethodsScreenProps> = ({
  userId,
  onBack,
  onManageCards,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('PIX');
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Tela carrega sem loading inicial
  }, []);

  const handleSelectMethod = async (method: PaymentMethodType) => {
    if (method === 'CREDIT_CARD') {
      // Vai para tela de gerenciar cartões
      onManageCards();
      return;
    }

    // Atualiza localmente (sem backend por enquanto)
    setSelectedMethod(method);
    setSelectedCard(null);
    Alert.alert('Sucesso', `Método de pagamento selecionado: ${getMethodName(method)}`);
  };

  const getMethodName = (method: PaymentMethodType): string => {
    const names = {
      PIX: 'PIX',
      CREDIT_CARD: 'Cartão de Crédito',
      CASH: 'Dinheiro',
    };
    return names[method];
  };

  const getMethodIcon = (method: PaymentMethodType): string => {
    const icons = {
      PIX: 'qr-code-outline',
      CREDIT_CARD: 'card-outline',
      CASH: 'cash-outline',
    };
    return icons[method];
  };

  const getMethodDescription = (method: PaymentMethodType): string => {
    const descriptions = {
      PIX: 'Pagamento instantâneo via QR Code',
      CREDIT_CARD: 'Pagamento automático com cartão',
      CASH: 'Pagamento em dinheiro na entrega',
    };
    return descriptions[method];
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meios de Pagamento</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f0f23" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meios de Pagamento</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#0066cc" />
            <Text style={styles.infoText}>
              Escolha seu método de pagamento preferido para as entregas.
            </Text>
          </View>

          {/* PIX */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'PIX' && styles.methodCardSelected,
            ]}
            onPress={() => handleSelectMethod('PIX')}
            disabled={saving}
          >
            <View style={styles.methodHeader}>
              <View style={styles.methodInfo}>
                <Ionicons
                  name={getMethodIcon('PIX') as any}
                  size={32}
                  color={selectedMethod === 'PIX' ? '#0f0f23' : '#666'}
                />
                <View style={styles.methodText}>
                  <Text style={[
                    styles.methodName,
                    selectedMethod === 'PIX' && styles.methodNameSelected
                  ]}>
                    {getMethodName('PIX')}
                  </Text>
                  <Text style={styles.methodDescription}>
                    {getMethodDescription('PIX')}
                  </Text>
                </View>
              </View>
              {selectedMethod === 'PIX' && (
                <Ionicons name="checkmark-circle" size={28} color="#10b981" />
              )}
            </View>
          </TouchableOpacity>

          {/* Cartão de Crédito */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'CREDIT_CARD' && styles.methodCardSelected,
            ]}
            onPress={() => handleSelectMethod('CREDIT_CARD')}
            disabled={saving}
          >
            <View style={styles.methodHeader}>
              <View style={styles.methodInfo}>
                <Ionicons
                  name={getMethodIcon('CREDIT_CARD') as any}
                  size={32}
                  color={selectedMethod === 'CREDIT_CARD' ? '#0f0f23' : '#666'}
                />
                <View style={styles.methodText}>
                  <Text style={[
                    styles.methodName,
                    selectedMethod === 'CREDIT_CARD' && styles.methodNameSelected
                  ]}>
                    {getMethodName('CREDIT_CARD')}
                  </Text>
                  <Text style={styles.methodDescription}>
                    {getMethodDescription('CREDIT_CARD')}
                  </Text>
                  {selectedCard && (
                    <View style={styles.selectedCardInfo}>
                      <Text style={styles.selectedCardBrand}>
                        {selectedCard.brand}
                      </Text>
                      <Text style={styles.selectedCardNumber}>
                        •••• {selectedCard.lastFourDigits}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.methodActions}>
                {selectedMethod === 'CREDIT_CARD' && (
                  <Ionicons name="checkmark-circle" size={28} color="#10b981" />
                )}
                <Ionicons name="chevron-forward" size={24} color="#999" style={{ marginLeft: 8 }} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Dinheiro */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'CASH' && styles.methodCardSelected,
            ]}
            onPress={() => handleSelectMethod('CASH')}
            disabled={saving}
          >
            <View style={styles.methodHeader}>
              <View style={styles.methodInfo}>
                <Ionicons
                  name={getMethodIcon('CASH') as any}
                  size={32}
                  color={selectedMethod === 'CASH' ? '#0f0f23' : '#666'}
                />
                <View style={styles.methodText}>
                  <Text style={[
                    styles.methodName,
                    selectedMethod === 'CASH' && styles.methodNameSelected
                  ]}>
                    {getMethodName('CASH')}
                  </Text>
                  <Text style={styles.methodDescription}>
                    {getMethodDescription('CASH')}
                  </Text>
                </View>
              </View>
              {selectedMethod === 'CASH' && (
                <Ionicons name="checkmark-circle" size={28} color="#10b981" />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.securityInfo}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#10b981" />
            <Text style={styles.securityText}>
              Seus dados de pagamento são criptografados e seguros
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e6f2ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 20,
  },
  methodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  methodCardSelected: {
    borderColor: '#0f0f23',
    backgroundColor: '#f9fafb',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodText: {
    marginLeft: 12,
    flex: 1,
  },
  methodName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  methodNameSelected: {
    color: '#0f0f23',
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
  },
  methodActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  selectedCardBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f0f23',
    marginRight: 8,
  },
  selectedCardNumber: {
    fontSize: 14,
    color: '#666',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  securityText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#10b981',
    textAlign: 'center',
  },
});

export default PaymentMethodsScreen;
