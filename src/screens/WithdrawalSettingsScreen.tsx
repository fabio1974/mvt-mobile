import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { bankAccountService, BankAccount } from '../services/bankAccountService';

interface WithdrawalSettingsScreenProps {
  userId: string;
  onBack: () => void;
  onMenuOpen?: () => void;
}

const TRANSFER_INTERVALS = [
  { label: 'Diário', value: 'Daily' },
  { label: 'Semanal', value: 'Weekly' },
  { label: 'Mensal', value: 'Monthly' },
];

const WEEK_DAYS = [
  { label: 'Segunda-feira', value: 1 },
  { label: 'Terça-feira', value: 2 },
  { label: 'Quarta-feira', value: 3 },
  { label: 'Quinta-feira', value: 4 },
  { label: 'Sexta-feira', value: 5 },
  { label: 'Sábado', value: 6 },
  { label: 'Domingo', value: 0 },
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => ({
  label: `Dia ${i + 1}`,
  value: i + 1,
}));

export default function WithdrawalSettingsScreen({
  userId,
  onBack,
  onMenuOpen,
}: WithdrawalSettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const edgeOpenResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const startX = evt.nativeEvent.pageX;
        return startX <= 24 && gestureState.dx > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: () => {},
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > 30) {
          onMenuOpen && onMenuOpen();
        }
      },
    })
  ).current;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [automaticTransfer, setAutomaticTransfer] = useState(true);
  const [transferInterval, setTransferInterval] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [transferDay, setTransferDay] = useState(2); // Default: Segunda-feira (1) ou Dia 2
  const [showIntervalDropdown, setShowIntervalDropdown] = useState(false);
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Sempre recarrega os dados do servidor quando a tela abre
  useEffect(() => {
    loadBankAccount();
  }, [userId]);

  const loadBankAccount = async () => {
    setLoading(true);
    try {
      console.log('🔄 Buscando configurações de saque do servidor...');
      const response = await bankAccountService.getUserBankAccounts(userId);

      if (response.success && Array.isArray(response.data)) {
        if (response.data.length > 0) {
          const bankAccount = response.data[0];
          setAccount(bankAccount);
          
          // Carrega configurações atuais do servidor
          setAutomaticTransfer(bankAccount.automaticTransfer ?? true);
          setTransferInterval(bankAccount.transferInterval || 'Weekly');
          setTransferDay(bankAccount.transferDay || (bankAccount.transferInterval === 'Monthly' ? 1 : 2));
          
          console.log('✅ Configurações de saque carregadas do servidor:', {
            id: bankAccount.id,
            automaticTransfer: bankAccount.automaticTransfer,
            transferInterval: bankAccount.transferInterval,
            transferDay: bankAccount.transferDay,
          });
        } else {
          console.log('⚠️ Nenhuma conta bancária encontrada');
          Alert.alert(
            'Atenção',
            'Você precisa cadastrar uma conta bancária antes de configurar o saque automático.',
            [{ text: 'OK', onPress: onBack }]
          );
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações de saque');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!account || !account.id) {
      Alert.alert('Erro', 'Conta bancária não encontrada. Por favor, cadastre seus dados bancários primeiro.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...account,
        automaticTransfer,
        transferInterval,
        transferDay,
        user: { id: userId },
      };

      // Sempre usa PUT pois só chega aqui se já houver conta bancária
      console.log('🔄 Atualizando configurações de saque (PUT)...', {
        id: account.id,
        automaticTransfer,
        transferInterval,
        transferDay,
      });
      
      const response = await bankAccountService.updateBankAccount(account.id, payload);

      if (response.success) {
        await loadBankAccount(); // Recarrega os dados do servidor
        setShowSuccessModal(true); // Mostra modal customizado
      } else {
        Alert.alert('Erro', response.error || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      Alert.alert('Erro', 'Erro de conexão ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const getTransferIntervalLabel = (value: string) => {
    return TRANSFER_INTERVALS.find(i => i.value === value)?.label || value;
  };

  const getTransferDayLabel = () => {
    if (transferInterval === 'Weekly') {
      return WEEK_DAYS.find(d => d.value === transferDay)?.label || `Dia ${transferDay}`;
    } else if (transferInterval === 'Monthly') {
      return `Dia ${transferDay}`;
    }
    return '';
  };

  const getDayOptions = () => {
    if (transferInterval === 'Weekly') {
      return WEEK_DAYS;
    } else if (transferInterval === 'Monthly') {
      return MONTH_DAYS;
    }
    return [];
  };

  const getFeeText = () => {
    if (!automaticTransfer) {
      return 'Saque automático desabilitado';
    }
    return 'Cada transferência tem um custo de R$ 3,67 (TED).';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View
        style={[styles.header, { paddingTop: insets.top + 10 }]}
        {...edgeOpenResponder.panHandlers}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configuração de Saque</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="calendar-outline" size={24} color="#3b82f6" />
            <Text style={styles.infoCardTitle}>Configuração de Saque Automático</Text>
          </View>
          <Text style={styles.infoCardDescription}>
            Configure quando o saldo disponível será transferido automaticamente para sua conta bancária.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Switch de Saque Automático */}
          <View style={styles.switchContainer}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.switchLabel}>Saque Automático</Text>
              <Text style={styles.switchSubLabel}>
                {automaticTransfer ? 'Habilitado' : 'Desabilitado'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.switch, automaticTransfer && styles.switchActive]}
              onPress={() => setAutomaticTransfer(!automaticTransfer)}
            >
              <View style={[styles.switchThumb, automaticTransfer && styles.switchThumbActive]} />
            </TouchableOpacity>
          </View>

          {automaticTransfer && (
            <>
              {/* Frequência do Saque */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Frequência do Saque</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowIntervalDropdown(!showIntervalDropdown)}
                >
                  <Text style={styles.dropdownText}>
                    {getTransferIntervalLabel(transferInterval)}
                  </Text>
                  <Ionicons
                    name={showIntervalDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>

                {showIntervalDropdown && (
                  <View style={styles.dropdownMenu}>
                    {TRANSFER_INTERVALS.map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.dropdownItem,
                          transferInterval === item.value && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setTransferInterval(item.value as any);
                          setShowIntervalDropdown(false);
                          // Reseta o dia quando muda a frequência
                          if (item.value === 'Weekly') {
                            setTransferDay(2); // Segunda-feira
                          } else if (item.value === 'Monthly') {
                            setTransferDay(1); // Dia 1
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            transferInterval === item.value && styles.dropdownItemTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Dia da Semana ou Mês */}
              {transferInterval !== 'Daily' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    {transferInterval === 'Weekly' ? 'Dia da Semana' : 'Dia do Mês'}
                  </Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowDayDropdown(!showDayDropdown)}
                  >
                    <Text style={styles.dropdownText}>{getTransferDayLabel()}</Text>
                    <Ionicons
                      name={showDayDropdown ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>

                  {showDayDropdown && (
                    <ScrollView style={styles.dropdownMenuScrollable} nestedScrollEnabled>
                      {getDayOptions().map((item) => (
                        <TouchableOpacity
                          key={item.value}
                          style={[
                            styles.dropdownItem,
                            transferDay === item.value && styles.dropdownItemActive,
                          ]}
                          onPress={() => {
                            setTransferDay(item.value);
                            setShowDayDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              transferDay === item.value && styles.dropdownItemTextActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Informação de Taxa */}
              <View style={styles.infoBox}>
                <View style={styles.infoBoxHeader}>
                  <Ionicons name="cash-outline" size={20} color="#3b82f6" />
                  <Text style={styles.infoBoxTitle}>
                    {transferInterval === 'Daily'
                      ? '⚠️ Atenção: Saque Diário'
                      : transferInterval === 'Weekly'
                      ? `Seu saldo será transferido toda ${getTransferDayLabel()}.`
                      : `Seu saldo será transferido todo ${getTransferDayLabel()}.`}
                  </Text>
                </View>
                <View style={styles.infoBoxContent}>
                  <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                  {transferInterval === 'Daily' ? (
                    <Text style={styles.infoBoxText}>
                      Com saque diário, você será cobrado R$ 3,67 (TED) <Text style={styles.emphasisText}>todos os dias</Text>. Recomendamos escolher saque semanal ou mensal para reduzir custos.
                    </Text>
                  ) : (
                    <Text style={styles.infoBoxText}>{getFeeText()}</Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Botões de Ação */}
      <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onBack}
          disabled={saving}
        >
          <Ionicons name="close" size={20} color="#666" />
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de Sucesso */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          onBack();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            </View>
            
            <Text style={styles.successTitle}>Configurações Salvas!</Text>
            <Text style={styles.successSubtitle}>
              Suas configurações de saque foram atualizadas com sucesso.
            </Text>

            <View style={styles.successDetailsCard}>
              <View style={styles.successDetailRow}>
                <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
                <Text style={styles.successDetailLabel}>Frequência:</Text>
                <Text style={styles.successDetailValue}>
                  {getTransferIntervalLabel(transferInterval)}
                </Text>
              </View>

              {transferInterval !== 'Daily' && (
                <View style={styles.successDetailRow}>
                  <Ionicons name="time-outline" size={20} color="#3b82f6" />
                  <Text style={styles.successDetailLabel}>
                    {transferInterval === 'Weekly' ? 'Dia da semana:' : 'Dia do mês:'}
                  </Text>
                  <Text style={styles.successDetailValue}>
                    {getTransferDayLabel()}
                  </Text>
                </View>
              )}

              <View style={styles.successDetailRow}>
                <Ionicons name="toggle-outline" size={20} color="#3b82f6" />
                <Text style={styles.successDetailLabel}>Saque automático:</Text>
                <Text style={styles.successDetailValue}>
                  {automaticTransfer ? 'Habilitado' : 'Desabilitado'}
                </Text>
              </View>
            </View>

            {transferInterval === 'Daily' && automaticTransfer && (
              <View style={styles.successWarningBox}>
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <Text style={styles.successWarningText}>
                  Com saque diário, você será cobrado R$ 3,67 (TED) <Text style={styles.emphasisText}>todos os dias</Text>. Considere saque semanal ou mensal para reduzir custos.
                </Text>
              </View>
            )}

            {transferInterval !== 'Daily' && automaticTransfer && (
              <View style={styles.successInfoBox}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={styles.successInfoText}>
                  Cada transferência tem um custo de R$ 3,67 (TED).
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                onBack();
              }}
            >
              <Text style={styles.successButtonText}>Entendido</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#0f0f23',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0369a1',
    flex: 1,
  },
  infoCardDescription: {
    fontSize: 14,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  switchContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  switchSubLabel: {
    fontSize: 14,
    color: '#666',
  },
  switch: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#3b82f6',
  },
  switchThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 24 }],
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    maxHeight: 200,
  },
  dropdownMenuScrollable: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 250,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    flex: 1,
  },
  infoBoxContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emphasisText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    color: '#92400e',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  successDetailsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  successDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successDetailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  successDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  successWarningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  successWarningText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
    lineHeight: 18,
  },
  successInfoBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  successInfoText: {
    fontSize: 13,
    color: '#1e40af',
    flex: 1,
    lineHeight: 18,
  },
  successButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
