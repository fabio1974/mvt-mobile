import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from "./src/navigation/AppNavigator";
import { apiClient } from "./src/services/api";

export default function App() {
  useEffect(() => {
    // Firebase Crashlytics desabilitado para Expo Go
    // Só funciona em production build (não no Expo Go)
    
    // Log da URL da API sendo usada
    const apiUrl = apiClient.getBaseURL();
    console.log("🌐 =================================");
    console.log("🌐 API URL configurada:", apiUrl);
    console.log("🌐 =================================");
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
