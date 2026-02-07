import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import OnboardingScreen from "../screens/OnboardingScreen";
import WelcomeScreen from "../screens/auth/WelcomeScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import UserTypeSelectionScreen from "../screens/UserTypeSelectionScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ResendConfirmationScreen from "../screens/ResendConfirmationScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import MainApp from "../screens/MainApp";
import { authService } from "../services/authService";

export type AuthState = "loading" | "onboarding" | "welcome" | "login" | "user-type-selection" | "register" | "resend-confirmation" | "forgot-password" | "authenticated";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  gender?: string;
}

type UserRole = 'CUSTOMER' | 'ESTABLISHMENT' | 'COURIER' | 'MANAGER';

export default function AppNavigator() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('CUSTOMER');
  const [resendEmail, setResendEmail] = useState<string>('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Verifica se é a primeira vez que o usuário abre o app
      const hasSeenOnboarding = await AsyncStorage.getItem("has_seen_onboarding");
      
      if (!hasSeenOnboarding) {
        setAuthState("onboarding");
        return;
      }

      // Verifica se existe token salvo
      const token = await AsyncStorage.getItem("auth_token");
      const userData = await AsyncStorage.getItem("user");

      if (token && userData) {
        // Token existe, tenta validar
        try {
          const response = await authService.validateToken();

          if (response.success) {
            // Token válido
            const user = response.user || JSON.parse(userData);
            setUser(user);
            setAuthState("authenticated");
            return;
          } else {
            // Token inválido
            await clearAuth();
          }
        } catch (error) {
          console.log("Token validation error:", error);
          // Erro na validação - limpa auth
          await clearAuth();
        }
      }

      // Tenta auto-login com credenciais salvas
      const autoLoginResult = await authService.tryAutoLogin();
      if (autoLoginResult && autoLoginResult.success) {
        console.log("✅ Auto-login realizado com sucesso!");
        setUser(autoLoginResult.user!);
        setAuthState("authenticated");
        return;
      }

      // Sem token e sem credenciais salvas - primeiro acesso
      setAuthState("welcome");
    } catch (error) {
      console.error("Error checking auth status:", error);
      setAuthState("welcome");
    }
  };

  const clearAuth = async () => {
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("user");
    // NÃO remove as credenciais salvas para permitir re-login automático
    // await AsyncStorage.removeItem("saved_email");
    // await AsyncStorage.removeItem("saved_password");
    // await AsyncStorage.removeItem("keep_logged_in");

    // Limpa auth header do apiClient
    const { apiClient } = await import("../services/api");
    await apiClient.clearAuthToken();

    setUser(null);
  };

  const handleWelcomeContinue = () => {
    setAuthState("login");
  };

  const handleLoginSuccess = async (userData: User) => {
    try {
      // Salva dados do usuário
      await AsyncStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      setAuthState("authenticated");
    } catch (error) {
      console.error("Error saving user data:", error);
    }
  };

  const handleBackToWelcome = () => {
    setAuthState("welcome");
  };

  const handleLogout = async () => {
    console.log("🔴 handleLogout chamado no AppNavigator");
    try {
      // Chama endpoint de logout
      try {
        console.log("🔴 Chamando authService.logout()");
        await authService.logout();
        console.log("🔴 authService.logout() concluído");
      } catch (error) {
        // Continua mesmo se logout falhar no backend
        console.log("Logout service error:", error);
      }

      // Limpa dados locais
      console.log("🔴 Limpando dados locais");
      await clearAuth();
      console.log("🔴 Dados limpos, mudando para welcome");
      setAuthState("welcome");
      console.log("🔴 Estado mudado para welcome");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleCreateAccount = () => {
    setAuthState("user-type-selection");
  };

  const handleSelectUserType = (role: UserRole) => {
    setSelectedRole(role);
    setAuthState("register");
  };

  const handleRegisterSuccess = () => {
    setAuthState("login");
  };

  const handleBackToLogin = () => {
    setAuthState("login");
  };

  const handleShowResendConfirmation = (email: string) => {
    setResendEmail(email);
    setAuthState("resend-confirmation");
  };

  const handleResendSuccess = () => {
    setAuthState("login");
  };

  const handleForgotPassword = () => {
    setAuthState("forgot-password");
  };

  const handleForgotPasswordSuccess = () => {
    setAuthState("login");
  };

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem("has_seen_onboarding", "true");
    setAuthState("login");
  };

  // Tela de loading enquanto verifica auth
  if (authState === "loading") {
    return <LoadingScreen />;
  }

  // Fluxo de autenticação
  switch (authState) {
    case "onboarding":
      return <OnboardingScreen onComplete={handleOnboardingComplete} />;

    case "welcome":
      return <WelcomeScreen onContinue={handleWelcomeContinue} />;

    case "login":
      return (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onBackToWelcome={handleBackToWelcome}
          onCreateAccount={handleCreateAccount}
          onForgotPassword={handleForgotPassword}
        />
      );

    case "user-type-selection":
      return (
        <UserTypeSelectionScreen
          visible={true}
          onClose={handleBackToLogin}
          onSelectType={handleSelectUserType}
        />
      );

    case "register":
      return (
        <RegisterScreen
          onBack={() => setAuthState("user-type-selection")}
          onSuccess={handleRegisterSuccess}
          initialRole={selectedRole}
          onShowResendConfirmation={handleShowResendConfirmation}
        />
      );

    case "resend-confirmation":
      return (
        <ResendConfirmationScreen
          initialEmail={resendEmail}
          onBack={handleBackToLogin}
          onSuccess={handleResendSuccess}
        />
      );

    case "forgot-password":
      return (
        <ForgotPasswordScreen
          onBack={handleBackToLogin}
          onSuccess={handleForgotPasswordSuccess}
        />
      );

    case "authenticated":
      if (!user) return <LoadingScreen />;
      return <MainApp user={user} onLogout={handleLogout} />;

    default:
      return <WelcomeScreen onContinue={handleWelcomeContinue} />;
  }
}

// Componente de loading simples
function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0f0f23",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 15,
          backgroundColor: "#1a1a2e",
          borderWidth: 2,
          borderColor: "#e94560",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 24 }}>⚡</Text>
      </View>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: "#ffffff",
          marginBottom: 8,
        }}
      >
        Zapi10
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: "#94a3b8",
        }}
      >
        Carregando...
      </Text>
    </View>
  );
}
