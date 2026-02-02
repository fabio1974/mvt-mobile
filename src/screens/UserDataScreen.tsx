import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiClient } from '../services/api';

interface UserDataScreenProps {
  userId: string;
  onBack: () => void;
  onMenuOpen: () => void;
}

interface UserData {
  id: string;
  username: string;
  name: string;
  phoneDdd: string;
  phoneNumber: string;
  dateOfBirth: string; // ISO format
  gender: 'MALE' | 'FEMALE' | '';
  documentNumber: string;
  role: string;
  addresses: any[];
  enabled: boolean;
  confirmed: boolean;
  employmentContracts: any[];
  clientContracts: any[];
  gpsLatitude?: number;
  gpsLongitude?: number;
}

const UserDataScreen: React.FC<UserDataScreenProps> = ({
  userId,
  onBack,
  onMenuOpen,
}) => {
  const insets = useSafeAreaInsets();

  // Form fields
  const [name, setName] = useState('');
  const [phoneDdd, setPhoneDdd] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('');
  const [documentNumber, setDocumentNumber] = useState('');

  // Hidden fields from API
  const [hiddenData, setHiddenData] = useState<Partial<UserData>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const parseDateFromBackend = (dateString: string): Date | null => {
    if (!dateString) return null;
    // Parse YYYY-MM-DD sem timezone (data local)
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // mês é 0-indexed
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/users/${userId}`);

      if (response.data) {
        const userData: UserData = response.data;

        // Set form fields
        setName(userData.name || '');
        setPhoneDdd(userData.phoneDdd || '');
        setPhoneNumber(userData.phoneNumber || '');
        setDateOfBirth(parseDateFromBackend(userData.dateOfBirth));
        setGender(userData.gender || '');
        setDocumentNumber(formatCPF(userData.documentNumber || ''));

        // Store hidden fields
        setHiddenData({
          id: userData.id,
          username: userData.username,
          role: userData.role,
          addresses: userData.addresses || [],
          enabled: userData.enabled,
          confirmed: userData.confirmed,
          employmentContracts: userData.employmentContracts || [],
          clientContracts: userData.clientContracts || [],
          gpsLatitude: userData.gpsLatitude,
          gpsLongitude: userData.gpsLongitude,
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados do usuário:', error);
      Alert.alert(
        'Erro',
        'Não foi possível carregar seus dados. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDateForAPI = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return 'Selecione a data';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCPF = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const removeCPFMask = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  const formatPhone = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 9);
  };

  const formatDDD = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 2);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha seu nome.');
      return false;
    }

    if (!phoneDdd.trim() || phoneDdd.length !== 2) {
      Alert.alert('Atenção', 'DDD deve ter 2 dígitos.');
      return false;
    }

    if (!phoneNumber.trim() || phoneNumber.length < 8) {
      Alert.alert('Atenção', 'Número de telefone inválido.');
      return false;
    }

    if (!dateOfBirth) {
      Alert.alert('Atenção', 'Por favor, selecione a data de nascimento.');
      return false;
    }

    if (!gender) {
      Alert.alert('Atenção', 'Por favor, selecione o sexo.');
      return false;
    }

    if (!documentNumber.trim() || removeCPFMask(documentNumber).length !== 11) {
      Alert.alert('Atenção', 'CPF deve ter 11 dígitos.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload: UserData = {
        ...hiddenData,
        id: userId,
        name: name.trim(),
        phoneDdd: phoneDdd.trim(),
        phoneNumber: phoneNumber.trim(),
        dateOfBirth: formatDateForAPI(dateOfBirth),
        gender: gender as 'MALE' | 'FEMALE',
        documentNumber: removeCPFMask(documentNumber),
      } as UserData;

      const response = await apiClient.put(`/users/${userId}`, payload);

      if (response.data) {
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Erro ao salvar dados do usuário:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.message || 'Não foi possível salvar seus dados. Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onBack();
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onMenuOpen} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dados do Usuário</Text>
          <View style={styles.menuButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.menuButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dados do Usuário</Text>
        <View style={styles.menuButton} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#0066cc" />
            <Text style={styles.infoText}>
              Mantenha seus dados atualizados para melhor atendimento.
            </Text>
          </View>

          {/* Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome Completo *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Digite seu nome completo"
              placeholderTextColor="#999"
            />
          </View>

          {/* Phone */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Telefone *</Text>
            <View style={styles.phoneContainer}>
              <TextInput
                style={[styles.input, styles.dddInput]}
                value={phoneDdd}
                onChangeText={(text) => setPhoneDdd(formatDDD(text))}
                placeholder="DDD"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                maxLength={2}
              />
              <TextInput
                style={[styles.input, styles.phoneInput]}
                value={phoneNumber}
                onChangeText={(text) => setPhoneNumber(formatPhone(text))}
                placeholder="Número"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                maxLength={9}
              />
            </View>
          </View>

          {/* Date of Birth */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Data de Nascimento *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateButtonText, !dateOfBirth && styles.placeholderText]}>
                {formatDateForDisplay(dateOfBirth)}
              </Text>
              <Ionicons name="calendar-outline" size={24} color="#666" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth || new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Gender */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Sexo *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={gender}
                onValueChange={(value) => setGender(value)}
                style={styles.picker}
              >
                <Picker.Item label="Selecione..." value="" />
                <Picker.Item label="Masculino" value="MALE" />
                <Picker.Item label="Feminino" value="FEMALE" />
              </Picker>
            </View>
          </View>

          {/* CPF */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>CPF *</Text>
            <TextInput
              style={styles.input}
              value={documentNumber}
              onChangeText={(text) => setDocumentNumber(formatCPF(text))}
              placeholder="000.000.000-00"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={14}
            />
          </View>

          {/* Email (read-only) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>E-mail (não editável)</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={hiddenData.username || ''}
              editable={false}
            />
          </View>

          {/* Save Button */}
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
                <Text style={styles.saveButtonText}>Salvar Alterações</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            <Text style={styles.successTitle}>Dados Atualizados!</Text>
            <Text style={styles.successMessage}>
              Suas informações foram atualizadas com sucesso.
            </Text>

            <View style={styles.successDetails}>
              <View style={styles.successDetailRow}>
                <Ionicons name="person-outline" size={18} color="#666" />
                <Text style={styles.successDetailText}>{name}</Text>
              </View>
              <View style={styles.successDetailRow}>
                <Ionicons name="call-outline" size={18} color="#666" />
                <Text style={styles.successDetailText}>
                  ({phoneDdd}) {phoneNumber}
                </Text>
              </View>
              <View style={styles.successDetailRow}>
                <Ionicons name="calendar-outline" size={18} color="#666" />
                <Text style={styles.successDetailText}>{formatDateForDisplay(dateOfBirth)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessModalClose}
            >
              <Text style={styles.successButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#0066cc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuButton: {
    padding: 8,
    width: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0066cc',
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
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dddInput: {
    flex: 1,
    maxWidth: 70,
  },
  phoneInput: {
    flex: 2,
  },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50,
  },
  saveButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 32,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  successDetails: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  successDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successDetailText: {
    fontSize: 16,
    color: '#333',
  },
  successButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default UserDataScreen;
