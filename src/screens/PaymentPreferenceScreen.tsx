import React, { useState, useEffect, useRef } from 'react';
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

interface PaymentPreferenceScreenProps {
  onBack: () => void;
  onAddCard: () => void;
  refreshTrigger?: number;
}

const PaymentPreferenceScreen: React.FC<PaymentPreferenceScreenProps> = ({
  onBack,
  onAddCard,
  refreshTrigger = 0,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferredMethod, setPreferredMethod] = useState<PaymentMethodType>('CREDIT_CARD');
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  
  // Estados para rastrear valores iniciais
  const [initialMethod, setInitialMethod] = useState<PaymentMethodType>('CREDIT_CARD');
  const [initialCardId, setInitialCardId] = useState<number | null>(null);
  
  // Refs para manter valores iniciais fixos (não mudam no reload)
  const initialMethodRef = useRef<PaymentMethodType | null>(null);
  const initialCardIdRef = useRef<number | null>(null);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    loadData();
  }, []);

  // Recarrega apenas cartões quando volta de "Meus Cartões" (mantém preferredMethod do usuário)
  useEffect(() => {
    if (refreshTrigger > 0 && !isFirstLoadRef.current) {
      console.log('🔄 [PaymentPreference] refreshTrigger mudou - recarregando apenas cartões...');
      reloadCards();
    }
  }, [refreshTrigger]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      console.log('🔄 [PaymentPreference] Iniciando loadData...');
      console.log('🔍 [PaymentPreference] isFirstLoad:', isFirstLoadRef.current);
      
      // Carrega preferência atual
      const preference = await paymentService.getPaymentPreference();
      setPreferredMethod(preference.preferredPaymentType);
      
      console.log('📦 [PaymentPreference] Preferência do backend:', preference);
      
      // Carrega cartões disponíveis
      const userCards = await paymentService.getCreditCards();
      setCards(userCards);
      
      console.log('💳 [PaymentPreference] Cartões carregados:', userCards.map(c => ({ id: c.id, brand: c.brand, last4: c.lastFourDigits, isDefault: c.isDefault })));
      
      // Busca o cartão default da lista (isDefault: true) - mais confiável que preference.defaultCardId
      const defaultCard = userCards.find(c => c.isDefault);
      const currentCardId = defaultCard?.id || preference.defaultCardId || null;
      
      console.log('✅ [PaymentPreference] Cartão default encontrado:', { defaultCardId: defaultCard?.id, currentCardId });
      
      setSelectedCardId(currentCardId);
      
      // Salva valores iniciais APENAS na primeira carga
      if (isFirstLoadRef.current) {
        console.log('🎯 [PaymentPreference] PRIMEIRA CARGA - Salvando valores iniciais...');
        setInitialMethod(preference.preferredPaymentType);
        setInitialCardId(currentCardId);
        initialMethodRef.current = preference.preferredPaymentType;
        initialCardIdRef.current = currentCardId;
        console.log('💾 [PaymentPreference] Valores iniciais salvos:', { initialMethod: preference.preferredPaymentType, initialCardId: currentCardId });
        isFirstLoadRef.current = false;
      } else {
        console.log('🔁 [PaymentPreference] RELOAD - Mantendo valores iniciais:', { initialMethod: initialMethodRef.current, initialCardId: initialCardIdRef.current });
      }
      
      console.log('📊 [PaymentPreference] Estado final:', {
        preferredMethod: preference.preferredPaymentType,
        selectedCardId: currentCardId,
        initialMethod: initialMethodRef.current,
        initialCardId: initialCardIdRef.current,
        willShowSaveButton: (preference.preferredPaymentType !== initialMethodRef.current || currentCardId !== initialCardIdRef.current)
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recarrega APENAS os cartões, sem tocar na preferredMethod (mantém seleção do usuário)
  const reloadCards = async () => {
    try {
      console.log('💳 [PaymentPreference] Recarregando apenas cartões (mantém preferredMethod)...');
      
      const userCards = await paymentService.getCreditCards();
      setCards(userCards);
      
      console.log('✅ [PaymentPreference] Cartões atualizados:', userCards.map(c => ({ id: c.id, brand: c.brand, last4: c.lastFourDigits, isDefault: c.isDefault })));
      
      // Atualiza selectedCardId apenas se houver cartão default
      const defaultCard = userCards.find(c => c.isDefault);
      if (defaultCard) {
        setSelectedCardId(defaultCard.id);
        console.log('✅ [PaymentPreference] Cartão default atualizado:', defaultCard.id);
      }
      
      console.log('📊 [PaymentPreference] Estado após reload de cartões:', {
        preferredMethod, // mantém o valor atual
        selectedCardId: defaultCard?.id || selectedCardId,
        cardsCount: userCards.length
      });
    } catch (error) {
      console.error('❌ [PaymentPreference] Erro ao recarregar cartões:', error);
    }
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

  // Log do estado de renderização
  console.log('🎨 [PaymentPreference] Renderizando interface:', {
    preferredMethod,
    selectedCardId,
    cardsCount: cards.length,
    cardIds: cards.map(c => c.id),
    initialMethod,
    initialCardId,
    willShowCard: preferredMethod === 'CREDIT_CARD' && selectedCardId && cards.length > 0,
    foundCard: cards.find(c => c.id === selectedCardId)
  });

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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info sobre cobrança automática */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#0066cc" />
          <Text style={styles.infoText}>
            Escolha seu meio de pagamento preferido para entregas e viagens.
          </Text>
        </View>

        {/* PIX */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            preferredMethod === 'PIX' && styles.methodCardSelected,
          ]}
          onPress={async () => {
            console.log('💾 [PaymentPreference] Salvando preferência PIX automaticamente');
            setPreferredMethod('PIX');
            try {
              setSaving(true);
              await paymentService.savePaymentPreference({
                preferredPaymentMethod: 'PIX',
                defaultCardId: undefined,
              });
              // Atualiza valores iniciais
              setInitialMethod('PIX');
              setInitialCardId(null);
              initialMethodRef.current = 'PIX';
              initialCardIdRef.current = null;
              console.log('✅ [PaymentPreference] PIX salvo com sucesso');
            } catch (error) {
              console.error('❌ Erro ao salvar PIX:', error);
              Alert.alert('Erro', 'Não foi possível salvar a preferência');
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
        >
          <View style={styles.methodHeader}>
            <View style={styles.methodInfo}>
              <Ionicons
                name="qr-code-outline"
                size={32}
                color={preferredMethod === 'PIX' ? '#0f0f23' : '#666'}
              />
              <View style={styles.methodTextContainer}>
                <Text style={[
                  styles.methodName,
                  preferredMethod === 'PIX' && styles.methodNameSelected
                ]}>
                  PIX
                </Text>
                <Text style={styles.methodDescription}>
                  Pagamento instantâneo via QR Code
                </Text>
              </View>
            </View>
            {preferredMethod === 'PIX' && (
              <Ionicons name="checkmark-circle" size={28} color="#10b981" />
            )}
          </View>
        </TouchableOpacity>

        {/* Cartão de Crédito */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            preferredMethod === 'CREDIT_CARD' && styles.methodCardSelected,
          ]}
          onPress={async () => {
            console.log('🎯 [PaymentPreference] Usuário clicou em Cartão de Crédito');
            
            // Se já está em CREDIT_CARD, navega direto para trocar de cartão
            if (preferredMethod === 'CREDIT_CARD') {
              console.log('🚀 [PaymentPreference] Já em CREDIT_CARD - navegando direto para Meus Cartões');
              onAddCard();
            } else {
              // Mudando de PIX/CASH para CREDIT_CARD
              console.log('📝 [PaymentPreference] Mudando para CREDIT_CARD');
              setPreferredMethod('CREDIT_CARD');
              
              // Se já tem cartão default, salva automaticamente
              if (selectedCardId) {
                console.log('💾 [PaymentPreference] Salvando CREDIT_CARD automaticamente com cartão:', selectedCardId);
                try {
                  setSaving(true);
                  await paymentService.savePaymentPreference({
                    preferredPaymentMethod: 'CREDIT_CARD',
                    defaultCardId: selectedCardId,
                  });
                  // Atualiza valores iniciais
                  setInitialMethod('CREDIT_CARD');
                  setInitialCardId(selectedCardId);
                  initialMethodRef.current = 'CREDIT_CARD';
                  initialCardIdRef.current = selectedCardId;
                  console.log('✅ [PaymentPreference] CREDIT_CARD salvo com sucesso');
                  
                  // Navega para Meus Cartões para trocar se quiser
                  onAddCard();
                } catch (error) {
                  console.error('❌ Erro ao salvar CREDIT_CARD:', error);
                  Alert.alert('Erro', 'Não foi possível salvar a preferência');
                } finally {
                  setSaving(false);
                }
              } else {
                // Não tem cartão, precisa ir para Meus Cartões escolher um
                console.log('⚠️ [PaymentPreference] Sem cartão default - navegando para Meus Cartões');
                Alert.alert(
                  'Cartão Necessário',
                  'Você precisa cadastrar ou selecionar um cartão.',
                  [{ text: 'OK', onPress: onAddCard }]
                );
              }
            }
          }}
          disabled={saving}
        >
          <View style={styles.methodHeader}>
            <View style={styles.methodInfo}>
              <Ionicons
                name="card-outline"
                size={32}
                color={preferredMethod === 'CREDIT_CARD' ? '#0f0f23' : '#666'}
              />
              <View style={styles.methodTextContainer}>
                <Text style={[
                  styles.methodName,
                  preferredMethod === 'CREDIT_CARD' && styles.methodNameSelected
                ]}>
                  Cartão de Crédito
                </Text>
                <Text style={styles.methodDescription}>
                  Pagamento automático com cartão
                </Text>
                {preferredMethod === 'CREDIT_CARD' && selectedCardId && cards.length > 0 && (
                  <View style={styles.selectedCardInfo}>
                    {(() => {
                      const card = cards.find(c => c.id === selectedCardId);
                      return card ? (
                        <Text style={styles.selectedCardText}>
                          {card.brand} •••• {card.lastFourDigits}
                        </Text>
                      ) : null;
                    })()}
                  </View>
                )}
              </View>
            </View>
            <View style={styles.methodActions}>
              {preferredMethod === 'CREDIT_CARD' && (
                <Ionicons name="checkmark-circle" size={28} color="#10b981" />
              )}
              <Ionicons name="chevron-forward" size={24} color="#999" style={{ marginLeft: 8 }} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Dinheiro - Desabilitado (em breve) */}
        <TouchableOpacity
          style={[
            styles.methodCard,
            styles.methodCardDisabled,
          ]}
          onPress={() => {
            // Desabilitado - em breve
          }}
          disabled={true}
        >
          <View style={styles.methodHeader}>
            <View style={styles.methodInfo}>
              <Ionicons
                name="cash-outline"
                size={32}
                color="#ccc"
              />
              <View style={styles.methodTextContainer}>
                <Text style={[styles.methodName, styles.methodNameDisabled]}>
                  Dinheiro
                </Text>
                <Text style={[styles.methodDescription, styles.methodDescriptionDisabled]}>
                  Pagamento em dinheiro na entrega
                </Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Em breve</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Aviso baseado no método selecionado */}
        {preferredMethod === 'PIX' && (
          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
            <Text style={styles.warningText}>
              Você receberá uma notificação com QR Code para pagar quando o entregador aceitar/iniciar.
            </Text>
          </View>
        )}

        {preferredMethod === 'CREDIT_CARD' && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
            <Text style={styles.successText}>
              <Text style={{ fontWeight: 'bold' }}>ENTREGA:</Text> Cobrado quando entregador aceita{'\n'}
              <Text style={{ fontWeight: 'bold' }}>VIAGEM:</Text> Cobrado quando motorista inicia
            </Text>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1e293b',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e6f2ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
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
  methodCardDisabled: {
    backgroundColor: '#fafafa',
    borderColor: '#ddd',
    opacity: 0.85,
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
  methodTextContainer: {
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
  methodNameDisabled: {
    color: '#888',
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
  },
  methodDescriptionDisabled: {
    color: '#999',
  },
  comingSoonBadge: {
    marginTop: 6,
    backgroundColor: '#6366f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  methodActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCardInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  selectedCardText: {
    fontSize: 13,
    color: '#0f0f23',
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  successBox: {
    flexDirection: 'row',
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  successText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#065f46',
    lineHeight: 22,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PaymentPreferenceScreen;
