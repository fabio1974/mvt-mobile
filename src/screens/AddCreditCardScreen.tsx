import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { paymentService } from '../services/paymentService';
import { tokenizeCard } from '../services/pagarmeService';
import {
  validateCardNumber,
  validateCVV,
  validateExpiration,
  formatCardNumber,
} from '../utils/cardValidation';
import { detectCardBrand, getCardBrandIcon } from '../utils/cardBrand';

interface AddCreditCardScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

const AddCreditCardScreen: React.FC<AddCreditCardScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [setAsDefault, setSetAsDefaultState] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detecta a bandeira do cartão baseado no número
  const detectedBrand = cardNumber ? detectCardBrand(cardNumber) : null;

  const handleCardNumberChange = (text: string) => {
    const formatted = formatCardNumber(text);
    setCardNumber(formatted);
  };

  const handleExpMonthChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setExpMonth(cleaned.slice(0, 2));
  };

  const handleExpYearChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setExpYear(cleaned.slice(0, 4));
  };

  const handleCvvChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setCvv(cleaned.slice(0, 4));
  };

  const validateForm = (): boolean => {
    if (!cardNumber || !validateCardNumber(cardNumber)) {
      Alert.alert('Erro', 'Número do cartão inválido');
      return false;
    }

    if (!cardHolderName.trim()) {
      Alert.alert('Erro', 'Nome do titular é obrigatório');
      return false;
    }

    if (!expMonth || !expYear || !validateExpiration(expMonth, expYear)) {
      Alert.alert('Erro', 'Data de validade inválida ou cartão expirado');
      return false;
    }

    const brand = detectCardBrand(cardNumber);
    if (!cvv || !validateCVV(cvv, brand)) {
      Alert.alert('Erro', `CVV inválido (${brand === 'AMEX' ? '4' : '3'} dígitos)`);
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      console.log('🔒 Iniciando processo de adicionar cartão...');

      // PASSO 1: Tokenizar no Pagar.me (dados sensíveis vão direto)
      console.log('🔵 Tokenizando cartão no Pagar.me...');
      const token = await tokenizeCard({
        number: cardNumber,
        holderName: cardHolderName.trim(),
        expMonth,
        expYear,
        cvv,
      });

      console.log('✅ Token recebido, enviando para backend...');

      // PASSO 2: Enviar token para nosso backend
      const card = await paymentService.addCreditCard({
        cardToken: token,
        setAsDefault,
      });

      console.log('✅ Cartão salvo:', card.maskedNumber);

      Alert.alert(
        'Sucesso!',
        `Cartão ${card.maskedNumber} adicionado com sucesso!`,
        [
          {
            text: 'OK',
            onPress: onSuccess,
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Erro ao adicionar cartão:', error);
      
      let errorMessage = 'Não foi possível adicionar o cartão';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adicionar Cartão</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#10b981" />
            <Text style={styles.infoText}>
              Seus dados são criptografados e protegidos pelo Pagar.me
            </Text>
          </View>

          {/* Card Number */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Número do Cartão *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={19}
                editable={!saving}
                autoFocus
              />
              {detectedBrand && detectedBrand !== 'OTHER' && (
                <Text style={styles.brandBadge}>{detectedBrand}</Text>
              )}
            </View>
          </View>

          {/* Card Holder Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome do Titular *</Text>
            <TextInput
              style={styles.input}
              value={cardHolderName}
              onChangeText={(text) => setCardHolderName(text.toUpperCase())}
              placeholder="NOME COMO ESTÁ NO CARTÃO"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              editable={!saving}
            />
          </View>

          {/* Expiry and CVV */}
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Validade *</Text>
              <View style={styles.expiryContainer}>
                <TextInput
                  style={[styles.input, styles.expiryInput]}
                  value={expMonth}
                  onChangeText={handleExpMonthChange}
                  placeholder="MM"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!saving}
                />
                <Text style={styles.expirySeparator}>/</Text>
                <TextInput
                  style={[styles.input, styles.expiryInput]}
                  value={expYear}
                  onChangeText={handleExpYearChange}
                  placeholder="AAAA"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={4}
                  editable={!saving}
                />
              </View>
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>CVV *</Text>
              <TextInput
                style={styles.input}
                value={cvv}
                onChangeText={handleCvvChange}
                placeholder="000"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.securityNote}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.securityNoteText}>
              O CVV são os 3 dígitos no verso do cartão (4 para Amex)
            </Text>
          </View>

          {/* Checkbox padrão */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setSetAsDefaultState(!setAsDefault)}
          >
            <View style={[styles.checkbox, setAsDefault && styles.checkboxChecked]}>
              {setAsDefault && <Ionicons name="checkmark" size={18} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Definir como cartão padrão</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                <Text style={styles.saveButtonText}>Adicionar Cartão</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            {'\n'}Ao adicionar o cartão, você concorda com os termos de uso do Pagar.me.{'\n'}
            Dados sensíveis nunca passam pelos nossos servidores.
          </Text>
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#059669',
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  brandBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f0f23',
    backgroundColor: '#e5e5e5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryInput: {
    flex: 1,
    textAlign: 'center',
  },
  expirySeparator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 8,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -12,
    marginBottom: 24,
  },
  securityNoteText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#0f0f23',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0f0f23',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#0f0f23',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default AddCreditCardScreen;
