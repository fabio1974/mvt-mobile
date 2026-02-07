import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../../services/authService";
import GradientText from "../../components/GradientText";

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onBackToWelcome?: () => void;
  onCreateAccount?: () => void;
  onForgotPassword?: () => void;
}

interface LoginData {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
    token: string;
  };
  message?: string;
}

export default function LoginScreen({
  onLoginSuccess,
  onBackToWelcome,
  onCreateAccount,
  onForgotPassword,
}: LoginScreenProps) {
  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true); // Novo estado para manter logado

  // Carrega as credenciais salvas quando o componente montar
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem("saved_email");
      const savedPassword = await AsyncStorage.getItem("saved_password");
      const keepLogged = await AsyncStorage.getItem("keep_logged_in");

      if (savedEmail && savedPassword && keepLogged === "true") {
        setFormData({
          email: savedEmail,
          password: savedPassword,
        });
        setKeepLoggedIn(true);
      }
    } catch (error) {
      console.error("Erro ao carregar credenciais salvas:", error);
    }
  };

  const handleInputChange = (field: keyof LoginData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      Alert.alert("Erro", "Por favor, informe seu email");
      return false;
    }

    if (!formData.email.includes("@")) {
      Alert.alert("Erro", "Por favor, informe um email válido");
      return false;
    }

    if (!formData.password.trim()) {
      Alert.alert("Erro", "Por favor, informe sua senha");
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert("Erro", "A senha deve ter pelo menos 6 caracteres");
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await authService.login(
        formData.email.trim(),
        formData.password
      );

      if (response.success) {
        // Salva ou remove credenciais baseado no checkbox
        if (keepLoggedIn) {
          await AsyncStorage.setItem("saved_email", formData.email.trim());
          await AsyncStorage.setItem("saved_password", formData.password);
          await AsyncStorage.setItem("keep_logged_in", "true");
        } else {
          await AsyncStorage.removeItem("saved_email");
          await AsyncStorage.removeItem("saved_password");
          await AsyncStorage.removeItem("keep_logged_in");
        }

        // Token já foi salvo pelo authService, apenas chama callback de sucesso
        onLoginSuccess(response.user);

        // Determina a saudação baseada no gênero
        const gender = response.user?.gender?.toUpperCase();
        let greeting = "Bem-vindo(a)";
        if (gender === "MALE") {
          greeting = "Bem-vindo";
        } else if (gender === "FEMALE") {
          greeting = "Bem-vinda";
        }

        // Login successful - no alert needed, just proceed to main screen
      } else {
        Alert.alert("Erro no login", response.error || "Credenciais inválidas");
      }
    } catch (error: any) {
      console.error("Login error:", error);

      let errorMessage =
        "Erro de conexão. Verifique sua internet e tente novamente.";

      // Verifica se é erro de resposta do servidor
      if (error.response?.data) {
        const serverMessage =
          error.response.data.message ||
          error.response.data.error ||
          error.response.data;

        // Converte mensagem do servidor para português
        if (
          serverMessage === "Invalid username or password" ||
          serverMessage.includes("Invalid username") ||
          serverMessage.includes("Invalid password")
        ) {
          errorMessage = "Usuário ou senha inválidos";
        } else {
          errorMessage = serverMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Erro no login", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToWelcome}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Image 
                source={require('../../../assets/icon.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <GradientText style={styles.appName}>Zapi10</GradientText>
            <Text style={styles.subtitle}>Faça login para continuar</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              placeholder="seu@email.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Senha</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(value) => handleInputChange("password", value)}
                placeholder="Sua senha"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text style={styles.passwordToggleText}>
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setKeepLoggedIn(!keepLoggedIn)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, keepLoggedIn && styles.checkboxChecked]}>
              {keepLoggedIn && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Manter-me conectado</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem uma conta?</Text>
          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={onCreateAccount}
            disabled={isLoading}
          >
            <Text style={styles.createAccountButtonText}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 8,
    marginBottom: 20,
  },
  backButtonText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "500",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: 76,
    height: 76,
  },
  logoEmoji: {
    fontSize: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#262640",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262640",
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#ffffff",
  },
  passwordToggle: {
    padding: 16,
  },
  passwordToggleText: {
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#64748b",
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: "#e94560",
    borderColor: "#e94560",
  },
  checkboxIcon: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  checkboxLabel: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#e94560",
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#e94560",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 12,
  },
  createAccountButton: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    minWidth: 200,
    alignItems: "center",
  },
  createAccountButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
