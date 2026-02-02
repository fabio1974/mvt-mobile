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
import { CreditCard } from '../types/payment';

interface ManageCreditCardsScreenProps {
  userId: string;
  onBack: () => void;
  onAddCard: () => void;
}

const ManageCreditCardsScreen: React.FC<ManageCreditCardsScreenProps> = ({
  userId,
  onBack,
  onAddCard,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const fetchedCards = await paymentService.getCreditCards();
      setCards(fetchedCards);
      
      const defaultCard = fetchedCards.find(c => c.isDefault);
      if (defaultCard) {
        setSelectedCardId(defaultCard.id);
      }
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus cartões');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCard = async (cardId: number) => {
    try {
      setSaving(true);
      await paymentService.setDefaultCard(cardId);
      
      setSelectedCardId(cardId);
      
      // Atualiza o estado local
      setCards(prevCards =>
        prevCards.map(card => ({
          ...card,
          isDefault: card.id === cardId,
        }))
      );
      
      Alert.alert('Sucesso', 'Cartão padrão atualizado');
    } catch (error) {
      console.error('Erro ao selecionar cartão:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o cartão padrão');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = (cardId: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    Alert.alert(
      'Excluir Cartão',
      `Deseja realmente excluir o cartão ${card.maskedNumber}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await paymentService.deleteCreditCard(cardId);
              setCards(prevCards => prevCards.filter(c => c.id !== cardId));
              
              if (selectedCardId === cardId) {
                setSelectedCardId(null);
              }
              
              Alert.alert('Sucesso', 'Cartão excluído com sucesso');
            } catch (error) {
              console.error('Erro ao excluir cartão:', error);
              Alert.alert('Erro', 'Não foi possível excluir o cartão');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const getBrandIcon = (brand: string): string => {
    const icons: Record<string, string> = {
      VISA: 'card',
      MASTERCARD: 'card',
      ELO: 'card',
      AMEX: 'card',
      HIPERCARD: 'card',
      OTHER: 'card',
    };
    return icons[brand] || 'card';
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meus Cartões</Text>
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
        <Text style={styles.headerTitle}>Meus Cartões</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {cards.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Nenhum cartão cadastrado</Text>
              <Text style={styles.emptyText}>
                Adicione um cartão de crédito para realizar pagamentos automáticos
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#0066cc" />
                <Text style={styles.infoText}>
                  Selecione o cartão que deseja usar como padrão para seus pagamentos.
                </Text>
              </View>

              {cards.map((card) => (
                <View key={card.id} style={styles.cardItem}>
                  <TouchableOpacity
                    style={styles.cardContent}
                    onPress={() => handleSelectCard(card.id)}
                    disabled={saving}
                  >
                    <View style={styles.cardLeft}>
                      <View
                        style={[
                          styles.radioButton,
                          selectedCardId === card.id && styles.radioButtonSelected,
                        ]}
                      >
                        {selectedCardId === card.id && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                      <View style={styles.cardInfo}>
                        <View style={styles.cardHeader}>
                          <Ionicons
                            name={getBrandIcon(card.brand) as any}
                            size={24}
                            color="#0f0f23"
                          />
                          <Text style={styles.cardBrand}>{card.brand}</Text>
                        </View>
                        <Text style={styles.cardNumber}>
                          •••• •••• •••• {card.lastFourDigits}
                        </Text>
                        <Text style={styles.cardHolder}>{card.holderName}</Text>
                        <Text style={styles.cardExpiry}>
                          Validade: {card.expiration}
                        </Text>
                        {card.lastUsedAt && (
                          <Text style={styles.cardLastUsed}>
                            Último uso: {new Date(card.lastUsedAt).toLocaleDateString('pt-BR')}
                          </Text>
                        )}
                        {card.isExpired && (
                          <View style={styles.expiredBadge}>
                            <Text style={styles.expiredText}>EXPIRADO</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteCard(card.id)}
                    disabled={saving}
                  >
                    <Ionicons name="trash-outline" size={24} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddCard}
            disabled={saving}
          >
            <Ionicons name="add-circle-outline" size={24} color="#0f0f23" />
            <Text style={styles.addButtonText}>Adicionar Novo Cartão</Text>
          </TouchableOpacity>
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
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
  cardItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: '#0f0f23',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0f0f23',
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f0f23',
    marginLeft: 8,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardLastUsed: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  expiredBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  expiredText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardHolder: {
    fontSize: 14,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fee',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#0f0f23',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f0f23',
    marginLeft: 8,
  },
});

export default ManageCreditCardsScreen;
