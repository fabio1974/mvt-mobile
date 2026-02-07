import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "../services/authService";

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function ForgotPasswordScreen({
  onBack,
  onSuccess,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      Alert.alert("Erro", "Por favor, informe seu email");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Erro", "Por favor, informe um email válido");
      return;
    }

    setIsLoading(true);

    try {
      await authService.forgotPassword(email);
      setShowSuccess(true);
    } catch (error: any) {
      console.error("Erro ao enviar email de recuperação:", error);

      let errorMessage =
        "Erro ao enviar email. Por favor, tente novamente.";

      if (error.response?.data) {
        const serverMessage =
          error.response.data.message ||
          error.response.data.error ||
          error.response.data;

        if (typeof serverMessage === "string") {
          errorMessage = serverMessage;
        }
      }

      Alert.alert("Erro", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Success View
  if (showSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>RECUPERAR SENHA</Text>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>

          {/* Success Card */}
          <View style={styles.successCard}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10b981" />
            </View>
            
            <Text style={styles.successTitle}>Email enviado!</Text>
            
            <Text style={styles.successMessage}>
              Se o email <Text style={styles.emailBold}>{email}</Text> estiver cadastrado, você receberá um link para redefinir sua senha.
            </Text>
            
            <Text style={styles.spamWarning}>
              Verifique também sua caixa de spam.
            </Text>
          </View>

          {/* Back to Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Lembrou sua senha?{" "}
              <Text style={styles.footerLink} onPress={onBack}>
                Fazer login
              </Text>
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Form View
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Header with navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>RECUPERAR SENHA</Text>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Digite seu email cadastrado para receber um link de recuperação de senha.
        </Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            E-mail<Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <View style={styles.inputIconContainer}>
              <Ionicons name="mail" size={20} color="#ef4444" />
            </View>
          </View>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            isLoading && styles.sendButtonDisabled,
          ]}
          onPress={handleSendResetLink}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>Enviar link de recuperação</Text>
          )}
        </TouchableOpacity>

        {/* Back to Login Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Lembrou sua senha?{" "}
            <Text style={styles.footerLink} onPress={onBack}>
              Fazer login
            </Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#6366f1",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#1a1a2e",
    borderRadius: 2,
    marginBottom: 32,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "100%",
    backgroundColor: "#6366f1",
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  inputIconContainer: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  sendButton: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginBottom: 24,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
    color: "#94a3b8",
  },
  footerLink: {
    color: "#6366f1",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  successCard: {
    backgroundColor: "#d1fae5",
    borderRadius: 16,
    padding: 32,
    marginBottom: 32,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 16,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
  },
  emailBold: {
    fontWeight: "bold",
    color: "#1f2937",
  },
  spamWarning: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
});
