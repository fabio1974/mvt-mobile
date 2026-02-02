import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../services/api';

interface ChangePasswordScreenProps {
  userId: string;
  onBack: () => void;
  onMenuOpen?: () => void;
}

export default function ChangePasswordScreen({
  userId,
  onBack,
  onMenuOpen,
}: ChangePasswordScreenProps) {
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSave = async () => {
    // Validações
    if (!currentPassword) {
      Alert.alert('Erro', 'Por favor, informe a senha atual');
      return;
    }

    if (!newPassword) {
      Alert.alert('Erro', 'Por favor, informe a nova senha');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'A nova senha e a confirmação não coincidem');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Erro', 'A nova senha deve ser diferente da senha atual');
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.data) {
        setShowSuccessModal(true);
        // Limpa os campos
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error('❌ Erro ao alterar senha:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao alterar senha. Verifique a senha atual.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
    }
  };

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
          <Text style={styles.headerTitle}>Alterar Senha</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#3b82f6" />
            <Text style={styles.infoCardTitle}>Alterar Senha</Text>
          </View>
          <Text style={styles.infoCardDescription}>
            Por segurança, você precisa informar sua senha atual para definir uma nova senha.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Senha Atual */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Senha Atual *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Digite sua senha atual"
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Nova Senha */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nova Senha *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Digite sua nova senha"
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Mínimo de 6 caracteres</Text>
          </View>

          {/* Confirmar Nova Senha */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirmar Nova Senha *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirme sua nova senha"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>
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
              <Text style={styles.saveButtonText}>Salvar Nova Senha</Text>
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
            
            <Text style={styles.successTitle}>Senha Alterada!</Text>
            <Text style={styles.successSubtitle}>
              Sua senha foi alterada com sucesso. Use a nova senha no próximo login.
            </Text>

            <View style={styles.successInfoBox}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.successInfoText}>
                Por segurança, recomendamos usar uma senha forte com letras, números e caracteres especiais.
              </Text>
            </View>

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
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 12,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
