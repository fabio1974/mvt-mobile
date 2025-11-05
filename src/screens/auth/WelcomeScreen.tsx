import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const { width, height } = Dimensions.get("window");

interface WelcomeScreenProps {
  onContinue: () => void;
}

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    // Animação de entrada
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Background gradiente simulado */}
      <View style={styles.background} />

      <View style={styles.content}>
        {/* Logo e nome do app */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </View>
          <Text style={styles.appName}>Zapi10</Text>
          <Text style={styles.tagline}>Delivery & Logistics</Text>
        </Animated.View>

        {/* Informações do app */}
        <Animated.View
          style={[
            styles.infoContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📦</Text>
            <Text style={styles.featureText}>Gestão de Entregas</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🗺️</Text>
            <Text style={styles.featureText}>Rastreamento em Tempo Real</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureText}>Interface Moderna</Text>
          </View>
        </Animated.View>

        {/* Botão de continuar */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Começar</Text>
            <Text style={styles.continueButtonIcon}>→</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View
        style={[
          styles.footer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Text style={styles.footerText}>Versão 1.0.0 • 2025</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0f0f23",
    // Simulando gradiente
    opacity: 0.9,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  logoIcon: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: "#1a1a2e",
    borderWidth: 3,
    borderColor: "#e94560",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#e94560",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 50,
  },
  appName: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 16,
    color: "#94a3b8",
    fontWeight: "500",
    letterSpacing: 1,
  },
  infoContainer: {
    width: "100%",
    marginBottom: 60,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#262640",
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
    flex: 1,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  continueButton: {
    backgroundColor: "#e94560",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 280,
    shadowColor: "#e94560",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginRight: 8,
  },
  continueButtonIcon: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "bold",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 40,
    paddingHorizontal: 32,
  },
  footerText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});
