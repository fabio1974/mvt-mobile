import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bankAccountService, BankAccount } from '../services/bankAccountService';

interface EditBankAccountModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSave?: (account: BankAccount) => void;
}

const BANK_CODES = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú' },
  { code: '422', name: 'Banco Safra' },
];

const ACCOUNT_TYPES = [
  { label: 'Conta Corrente', value: 'CHECKING' },
  { label: 'Conta Poupança', value: 'SAVINGS' },
];

const STATUSES = [
  { label: 'Aguardando Validação', value: 'PENDING_VALIDATION' },
  { label: 'Ativa', value: 'ACTIVE' },
  { label: 'Inativa', value: 'INACTIVE' },
];

export default function EditBankAccountModal({
  visible,
  userId,
  onClose,
  onSave,
}: EditBankAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<BankAccount>({
    bankCode: '001',
    agency: '',
    agencyDigit: '',
    accountNumber: '',
    accountDigit: '',
    accountType: 'CHECKING',
    automaticTransfer: true,
    status: 'PENDING_VALIDATION',
  });
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [showAccountTypeDropdown, setShowAccountTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    if (visible) {
      loadBankAccount();
    }
  }, [visible]);

  const loadBankAccount = async () => {
    setLoading(true);
    try {
      const response = await bankAccountService.getUserBankAccounts(userId);
      
      if (response.success && Array.isArray(response.data)) {
        // Se houver contas, carrega a primeira
        if (response.data.length > 0) {
          setAccount(response.data[0]);
          console.log('✅ Conta bancária carregada:', response.data[0]);
        } else {
          // Se não houver, reseta para valores padrão vazios
          setAccount({
            bankCode: '001',
            agency: '',
            agencyDigit: '',
            accountNumber: '',
            accountDigit: '',
            accountType: 'CHECKING',
            automaticTransfer: true,
            status: 'PENDING_VALIDATION',
          });
          console.log('ℹ️ Nenhuma conta bancária encontrada');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar conta bancária:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados bancários');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validações básicas
    if (!account.bankCode || !account.agency || !account.accountNumber) {
      Alert.alert('Erro', 'Por favor, preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...account,
        user: { id: userId },
      };

      let response;
      if (account.id) {
        // Atualizar
        response = await bankAccountService.updateBankAccount(account.id, payload);
      } else {
        // Criar
        const { id, ...createPayload } = payload;
        response = await bankAccountService.createBankAccount(createPayload);
      }

      if (response.success) {
        Alert.alert(
          'Sucesso',
          account.id ? 'Conta bancária atualizada!' : 'Conta bancária criada!'
        );
        if (onSave && response.data) {
          onSave(response.data as BankAccount);
        }
        onClose();
      } else {
        Alert.alert('Erro', response.error || 'Erro ao salvar conta bancária');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar conta bancária:', error);
      Alert.alert('Erro', 'Erro de conexão ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const selectedBankName = BANK_CODES.find(
    b => b.code === account.bankCode
  )?.name || 'Selecionar Banco';

  const selectedAccountType = ACCOUNT_TYPES.find(
    t => t.value === account.accountType
  )?.label || 'Selecionar Tipo';

  const selectedStatus = STATUSES.find(
    s => s.value === account.status
  )?.label || 'Selecionar Status';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Editar Contas Bancária</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={styles.loadingText}>Carregando dados...</Text>
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Código do Banco */}
              <View style={styles.section}>
                <Text style={styles.label}>
                  Código do Banco<Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowBankDropdown(!showBankDropdown)}
                >
                  <Text style={styles.dropdownText}>{selectedBankName}</Text>
                  <Ionicons
                    name={showBankDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>

                {showBankDropdown && (
                  <View style={styles.dropdownMenu}>
                    {BANK_CODES.map(bank => (
                      <TouchableOpacity
                        key={bank.code}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setAccount({ ...account, bankCode: bank.code });
                          setShowBankDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            account.bankCode === bank.code && styles.dropdownItemSelected,
                          ]}
                        >
                          {bank.code} - {bank.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Agência e Dígito */}
              <View style={styles.rowContainer}>
                <View style={[styles.section, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>
                    Agência<Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="3474"
                    value={account.agency}
                    onChangeText={text => setAccount({ ...account, agency: text })}
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={[styles.section, { flex: 0.5 }]}>
                  <Text style={styles.label}>
                    Dígito<Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="6"
                    maxLength={1}
                    value={account.agencyDigit}
                    onChangeText={text => setAccount({ ...account, agencyDigit: text })}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Número da Conta e Dígito */}
              <View style={styles.rowContainer}>
                <View style={[styles.section, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>
                    Número da Conta<Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="19381"
                    value={account.accountNumber}
                    onChangeText={text =>
                      setAccount({ ...account, accountNumber: text })
                    }
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={[styles.section, { flex: 0.5 }]}>
                  <Text style={styles.label}>
                    Dígito<Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="X"
                    maxLength={1}
                    value={account.accountDigit}
                    onChangeText={text =>
                      setAccount({ ...account, accountDigit: text })
                    }
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              {/* Tipo de Conta */}
              <View style={styles.section}>
                <Text style={styles.label}>
                  Tipo de Conta<Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowAccountTypeDropdown(!showAccountTypeDropdown)}
                >
                  <Text style={styles.dropdownText}>{selectedAccountType}</Text>
                  <Ionicons
                    name={showAccountTypeDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>

                {showAccountTypeDropdown && (
                  <View style={styles.dropdownMenu}>
                    {ACCOUNT_TYPES.map(type => (
                      <TouchableOpacity
                        key={type.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setAccount({ ...account, accountType: type.value as any });
                          setShowAccountTypeDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            account.accountType === type.value &&
                              styles.dropdownItemSelected,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Status */}
              <View style={styles.section}>
                <Text style={styles.label}>
                  Status<Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                >
                  <Text style={styles.dropdownText}>{selectedStatus}</Text>
                  <Ionicons
                    name={showStatusDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>

                {showStatusDropdown && (
                  <View style={styles.dropdownMenu}>
                    {STATUSES.map(status => (
                      <TouchableOpacity
                        key={status.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setAccount({ ...account, status: status.value as any });
                          setShowStatusDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            account.status === status.value &&
                              styles.dropdownItemSelected,
                          ]}
                        >
                          {status.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Transferência Automática */}
              <View style={styles.checkboxSection}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() =>
                    setAccount({
                      ...account,
                      automaticTransfer: !account.automaticTransfer,
                    })
                  }
                >
                  {account.automaticTransfer && (
                    <Ionicons name="checkmark" size={20} color="#7c3aed" />
                  )}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Transferência Automática</Text>
              </View>

              <View style={{ height: 80 }} />
            </ScrollView>
          )}

          {/* Footer com botões */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#666',
  },
  dropdownItemSelected: {
    color: '#7c3aed',
    fontWeight: '600',
  },
  checkboxSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#f9f9f9',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
