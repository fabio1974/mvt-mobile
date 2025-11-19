import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { apiClient } from "./src/services/api";

export default function App() {
  useEffect(() => {
    // Log da URL da API sendo usada
    const apiUrl = apiClient.getBaseURL();
    console.log("🌐 =================================");
    console.log("🌐 API URL configurada:", apiUrl);
    console.log("🌐 =================================");
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
