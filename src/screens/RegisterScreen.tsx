import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/authService';

type UserRole = 'CUSTOMER' | 'ESTABLISHMENT' | 'COURIER' | 'MANAGER';

interface RegisterScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  initialRole?: UserRole;
  onShowResendConfirmation?: (email: string) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: 'Cliente',
  ESTABLISHMENT: 'Estabelecimento',
  COURIER: 'Motoboy',
  MANAGER: 'Gerente',
};

export default function RegisterScreen({
  onBack,
  onSuccess,
  initialRole = 'CUSTOMER',
  onShowResendConfirmation,
}: RegisterScreenProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role] = useState<UserRole>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const limited = cleaned.slice(0, 11);
    
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  };

  const handleCPFChange = (text: string) => {
    setCpf(formatCPF(text));
  };

  const validateCPF = (cpf: string): boolean => {
    const cpfClean = cpf.replace(/\D/g, '');
    
    if (cpfClean.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais (CPF inválido)
    if (/^(\d)\1{10}$/.test(cpfClean)) return false;
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpfClean.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpfClean.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpfClean.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpfClean.charAt(10))) return false;
    
    return true;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 6) {
      return { valid: false, message: 'A senha deve ter no mínimo 6 caracteres' };
    }
    
    if (!/\d/.test(password)) {
      return { valid: false, message: 'A senha deve conter pelo menos um número' };
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'A senha deve conter pelo menos um caractere especial (!@#$%^&*...)' };
    }
    
    return { valid: true };
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, informe seu nome completo');
      return false;
    }

    // Valida se tem pelo menos nome e sobrenome (2 palavras)
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      Alert.alert('Erro', 'Por favor, informe seu nome e sobrenome');
      return false;
    }

    if (!validateCPF(cpf)) {
      Alert.alert('Erro', 'CPF inválido. Verifique os números digitados.');
      return false;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Erro', 'E-mail inválido. Digite um e-mail válido.');
      return false;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      Alert.alert('Erro', passwordValidation.message || 'Senha inválida');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      console.log('📝 Iniciando registro de usuário...');

      const cpfClean = cpf.replace(/\D/g, '');
      
      const result = await authService.register({
        name: name.trim(),
        username: email.trim().toLowerCase(),
        cpf: cpfClean,
        password,
        role,
      });

      if (result.success) {
        Alert.alert(
          'Sucesso! 🎉',
          'Conta criada com sucesso! Faça login para continuar.',
          [
            {
              text: 'OK',
              onPress: onSuccess,
            },
          ]
        );
      } else {
        // Se for erro 409 (email já cadastrado), mostra opção de reenviar email
        if (result.statusCode === 409 && result.error?.includes('já está cadastrado')) {
          Alert.alert(
            'Email já cadastrado',
            result.error + '\n\nSe você ainda não confirmou seu email, podemos reenviar o link de confirmação.',
            [
              {
                text: 'Cancelar',
                style: 'cancel',
              },
              {
                text: 'Reenviar Email',
                onPress: () => {
                  if (onShowResendConfirmation) {
                    onShowResendConfirmation(email.trim().toLowerCase());
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Erro', result.error || 'Não foi possível criar a conta');
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao registrar:', error);
      Alert.alert('Erro', error.message || 'Ocorreu um erro ao criar a conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.title}>CRIAR CONTA</Text>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Nome */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nome<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nome e sobrenome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* CPF */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              CPF<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="000.000.000-00"
              value={cpf}
              onChangeText={handleCPFChange}
              keyboardType="number-pad"
              maxLength={14}
            />
          </View>

          {/* E-mail */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              E-mail<Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Senha<Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmar Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Confirmar Senha<Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tipo de Usuário (Read-only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Usuário</Text>
            <View style={styles.roleContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
              <Text style={styles.roleText}>{ROLE_LABELS[role]}</Text>
            </View>
          </View>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.registerButton, loading && styles.registerButtonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Já possui uma conta? </Text>
          <TouchableOpacity onPress={onSuccess}>
            <Text style={styles.loginLinkButton}>Fazer login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5b21b6',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 32,
  },
  progressFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#5b21b6',
    borderRadius: 2,
  },
  form: {
    gap: 20,
    marginBottom: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  eyeButton: {
    padding: 12,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  roleText: {
    fontSize: 16,
    color: '#1e40af',
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#5b21b6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 15,
    color: '#64748b',
  },
  loginLinkButton: {
    fontSize: 15,
    color: '#5b21b6',
    fontWeight: '600',
  },
});
