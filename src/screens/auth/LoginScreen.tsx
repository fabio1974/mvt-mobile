import React, { useState } from "react";
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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { authService } from "../../services/authService";

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onBackToWelcome?: () => void;
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
}: LoginScreenProps) {
  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        // Token já foi salvo pelo authService, apenas chama callback de sucesso
        onLoginSuccess(response.user);

        Alert.alert(
          "Login realizado!",
          `Bem-vindo(a), ${response.user?.name}!`
        );
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
    Alert.alert(
      "Recuperar senha",
      "Funcionalidade em desenvolvimento. Entre em contato com o suporte.",
      [{ text: "OK" }]
    );
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
              <Text style={styles.logoEmoji}>⚡</Text>
            </View>
            <Text style={styles.appName}>Zapi10</Text>
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
          <Text style={styles.footerText}>
            Não tem uma conta?{" "}
            <Text style={styles.footerLink}>
              Entre em contato com o suporte
            </Text>
          </Text>

          {/* Credenciais de teste em desenvolvimento */}
          {__DEV__ && (
            <View style={styles.testCredentials}>
              <Text style={styles.testTitle}>🧪 Credenciais de Teste:</Text>
              <Text style={styles.testText}>admin@zapi10.com / 123456</Text>
              <Text style={styles.testText}>
                jose.barros@zapi10.com / 123456
              </Text>
              <Text style={styles.testText}>
                entregador@zapi10.com / 123456
              </Text>
            </View>
          )}
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
    backgroundColor: "#1a1a2e",
    borderWidth: 2,
    borderColor: "#e94560",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
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
  },
  footerLink: {
    color: "#e94560",
    fontWeight: "500",
  },
  testCredentials: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  testTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  testText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 4,
    textAlign: "center",
    opacity: 0.9,
  },
});
