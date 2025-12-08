import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WelcomeScreen from "../screens/auth/WelcomeScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import MainApp from "../screens/MainApp";
import { authService } from "../services/authService";

export type AuthState = "loading" | "welcome" | "login" | "authenticated";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  gender?: string;
}

export default function AppNavigator() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
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

    // Só limpa o apiClient se não estiver usando mock
    if (!authService.isUsingMock()) {
      const { apiClient } = await import("../services/api");
      await apiClient.clearAuthToken();
    }

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

  // Tela de loading enquanto verifica auth
  if (authState === "loading") {
    return <LoadingScreen />;
  }

  // Fluxo de autenticação
  switch (authState) {
    case "welcome":
      return <WelcomeScreen onContinue={handleWelcomeContinue} />;

    case "login":
      return (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onBackToWelcome={handleBackToWelcome}
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
