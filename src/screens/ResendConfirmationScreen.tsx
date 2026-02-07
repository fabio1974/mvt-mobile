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

interface ResendConfirmationScreenProps {
  initialEmail: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function ResendConfirmationScreen({
  initialEmail,
  onBack,
  onSuccess,
}: ResendConfirmationScreenProps) {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResend = async () => {
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
      const response = await authService.resendConfirmation(email);

      // Verifica se o email já foi confirmado
      if (response.message?.includes("já foi confirmado") || 
          response.message?.includes("already confirmed")) {
        Alert.alert(
          "Email já confirmado! ✓",
          response.message || "Este email já foi confirmado. Você pode fazer login.",
          [
            {
              text: "Fazer Login",
              onPress: onSuccess,
            },
          ]
        );
      } else {
        // Email de confirmação enviado com sucesso
        Alert.alert(
          "Email enviado!",
          "Verifique sua caixa de entrada e siga as instruções para confirmar seu email.",
          [
            {
              text: "OK",
              onPress: onSuccess,
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Erro ao reenviar email:", error);

      let errorMessage =
        "Erro ao reenviar email. Por favor, tente novamente.";

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color="#3b82f6" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Reenviar Email de Confirmação</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Informe seu email para receber um novo link de confirmação.
        </Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
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

        {/* Resend Button */}
        <TouchableOpacity
          style={[
            styles.resendButton,
            isLoading && styles.resendButtonDisabled,
          ]}
          onPress={handleResend}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.resendButtonText}>Reenviar Email</Text>
          )}
        </TouchableOpacity>

        {/* Back to Login Link */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={onBack}
          disabled={isLoading}
        >
          <Text style={styles.backLinkText}>Voltar para Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 24,
    position: "relative",
  },
  input: {
    backgroundColor: "#ffffff",
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
  resendButton: {
    width: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  backLink: {
    padding: 8,
  },
  backLinkText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
