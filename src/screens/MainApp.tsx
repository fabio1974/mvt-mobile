import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { unifiedLocationService } from "../services/unifiedLocationService";
import { notificationService } from "../services/notificationService";
import AvailableRidesScreen from "./delivery/AvailableRidesScreen";
import RideInviteModal from "../components/delivery/RideInviteModal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MainAppProps {
  user: User | null;
  onLogout: () => void;
}

type Screen = "dashboard" | "available-rides" | "active-ride";

export default function MainApp({ user, onLogout }: MainAppProps) {
  const [locationStatus, setLocationStatus] = useState<string>("Não iniciado");
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [showRideInvite, setShowRideInvite] = useState(false);
  const [inviteDeliveryId, setInviteDeliveryId] = useState<string | null>(null);
  const [inviteDeliveryData, setInviteDeliveryData] = useState<any>(null);

  // Verifica se o usuário é entregador
  const userRole = user?.role?.toUpperCase() || "";
  const isDelivery = userRole === "COURIER";

  // Inicia tracking de localização quando o componente monta
  useEffect(() => {
    // Reset dos estados do modal para garantir que não apareça inadvertidamente
    setShowRideInvite(false);
    setInviteDeliveryId(null);
    setInviteDeliveryData(null);

    startLocationTracking();

    // Se for entregador, inicializa notificações
    if (isDelivery) {
      initializeNotifications();
    }

    // Cleanup quando componente desmonta
    return () => {
      unifiedLocationService.stopTracking();
      if (isDelivery) {
        notificationService.destroy();
      }
    };
  }, [isDelivery]);

  const startLocationTracking = async () => {
    try {
      setLocationStatus("Iniciando...");

      // Verifica disponibilidade do serviço
      if (!unifiedLocationService.isAvailable()) {
        setLocationStatus("Não suportado ❌");
        return;
      }

      // Obtém informações da plataforma
      const platformInfo = unifiedLocationService.getPlatformInfo();
      console.log(`📍 Plataforma detectada:`, platformInfo);

      const success = await unifiedLocationService.startTracking();

      if (success) {
        setLocationStatus(`Ativo ✅ (${platformInfo.platform})`);
        console.log("📍 Location tracking iniciado com sucesso");

        // Otimiza configurações baseado no role do usuário
        if (user?.role) {
          unifiedLocationService.optimizeForUserRole(user.role);
        }

        // Faz um teste inicial
        setTimeout(() => {
          unifiedLocationService.testGeolocation();
        }, 2000);
      } else {
        setLocationStatus("Erro ❌");
        Alert.alert(
          "Localização",
          `Não foi possível ativar o tracking de localização no ${platformInfo.platform}. Verifique as permissões.`
        );
      }
    } catch (error) {
      console.error("❌ Erro ao iniciar location tracking:", error);
      setLocationStatus("Erro ❌");
    }
  };

  const initializeNotifications = async () => {
    try {
      console.log("🔔 [MainApp] Inicializando notificações para entregador...");
      console.log("🔔 [MainApp] User:", user?.email, "Role:", user?.role);
      console.log("🔔 [MainApp] Platform:", Platform.OS);
      console.log("🔔 [MainApp] __DEV__:", __DEV__);

      const success = await notificationService.initialize();

      if (success) {
        // Verifica se o token foi gerado
        const token = notificationService.getPushToken();

        // Se o token não foi gerado, tenta novamente
        if (!token) {
          await notificationService.registerPushToken();
        }

        // Teste de notificação para desenvolvimento - DESABILITADO
        // if (__DEV__) {
        //   setTimeout(() => {
        //     simulateDeliveryInvite();
        //   }, 5000);
        // }
      } else {
        console.warn("Falha ao inicializar notificações");
      }
    } catch (error) {
      console.error("❌ [MainApp] Erro ao inicializar notificações:", error);
    }
  };

  const simulateDeliveryInvite = () => {
    console.log("🧪 [MainApp] simulateDeliveryInvite chamada");
    console.log("🧪 [MainApp] __DEV__:", __DEV__);
    console.log("🧪 [MainApp] isDelivery:", isDelivery);

    if (__DEV__ && isDelivery) {
      console.log("🧪 [MainApp] Executando simulação de convite...");
      setInviteDeliveryId("test-delivery-123");
      setInviteDeliveryData({
        clientName: "João Silva",
        value: 25.5,
        address: "Rua das Flores, 123 - Centro, São Paulo - SP",
      });
      setShowRideInvite(true);
    } else {
      console.log(
        "🧪 [MainApp] Simulação não executada - condições não atendidas"
      );
    }
  };

  const handleLogout = async () => {
    console.log("🔴 Botão Sair pressionado");

    try {
      // Para o tracking de localização antes do logout
      await unifiedLocationService.stopTracking();

      // Para notificações se for entregador
      if (isDelivery) {
        await notificationService.unregisterPushToken();
        notificationService.destroy();
      }
    } catch (error) {
      console.error("❌ Erro durante logout:", error);
    }

    // Logout direto para testar (sem Alert)
    console.log("🔴 Fazendo logout direto");
    onLogout();
  };

  const handleRideInviteAccept = (deliveryId: string) => {
    setShowRideInvite(false);
    setCurrentScreen("active-ride");
  };

  const handleRideInviteReject = (deliveryId: string) => {
    setShowRideInvite(false);
  };

  const handleRideInviteClose = () => {
    setShowRideInvite(false);
    setInviteDeliveryId(null);
    setInviteDeliveryData(null);
  };

  const handleRideSelect = (deliveryId: string) => {
    console.log(`🚚 Visualizando detalhes da entrega ${deliveryId}`);
    setCurrentScreen("active-ride");
  };

  const handleBackToDashboard = () => {
    setCurrentScreen("dashboard");
  };

  // Renderiza tela específica baseada no estado atual
  if (currentScreen === "available-rides") {
    console.log("🚚 Renderizando AvailableRidesScreen");
    return (
      <AvailableRidesScreen
        onRideSelect={handleRideSelect}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (currentScreen === "active-ride") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.content}>
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>🚚 Entrega Ativa</Text>
            <Text style={styles.welcomeSubtitle}>
              Funcionalidade em desenvolvimento
            </Text>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleBackToDashboard}
            >
              <Text style={styles.testButtonText}>← Voltar ao Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Dashboard principal
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>⚡</Text>
          </View>
          <Text style={styles.appName}>Zapi10</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>
            Bem-vindo(a), {user?.name || "Usuário"}! 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>Email: {user?.email}</Text>
          <Text style={styles.welcomeSubtitle}>Perfil: {user?.role}</Text>
          <Text style={styles.welcomeSubtitle}>
            📍 Localização: {locationStatus}
          </Text>

          {/* Botão de teste para todas as plataformas */}
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => unifiedLocationService.testGeolocation()}
          >
            <Text style={styles.testButtonText}>🧪 Testar Localização</Text>
          </TouchableOpacity>

          {/* Botão específico para entregadores */}
          {isDelivery && (
            <>
              {/* Botões de teste removidos - usar menu oficial abaixo */}

              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: "#10b981" }]}
                onPress={async () => {
                  console.log("🔔 Testando notificação push...");
                  try {
                    await notificationService.simulateDeliveryInvite(
                      "test-push-notification"
                    );
                  } catch (error) {
                    console.error(
                      "Erro ao enviar notificação de teste:",
                      error
                    );
                  }
                }}
              >
                <Text style={styles.testButtonText}>
                  🔔 Testar Notificação Push
                </Text>
              </TouchableOpacity>

              {Platform.OS === "web" && (
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: "#f97316" }]}
                  onPress={async () => {
                    try {
                      if (
                        "serviceWorker" in navigator &&
                        "PushManager" in window
                      ) {
                        console.log("🧪 Testando Service Worker...");

                        const registration = await navigator.serviceWorker
                          .ready;
                        console.log("✅ Service Worker ready:", registration);

                        // Testa se há subscription ativa
                        const subscription =
                          await registration.pushManager.getSubscription();
                        console.log("📧 Push Subscription:", subscription);

                        if (subscription) {
                          Alert.alert(
                            "Service Worker Status",
                            `✅ SW Ativo\n✅ Push Subscription Ativa\n\nEndpoint: ${subscription.endpoint.substring(
                              0,
                              50
                            )}...`
                          );
                        } else {
                          Alert.alert(
                            "Service Worker Status",
                            "✅ SW Ativo\n❌ Sem Push Subscription"
                          );
                        }
                      } else {
                        Alert.alert("Erro", "Push não suportado neste browser");
                      }
                    } catch (error) {
                      console.error("Erro ao verificar SW:", error);
                      Alert.alert("Erro", `❌ ${error}`);
                    }
                  }}
                >
                  <Text style={styles.testButtonText}>
                    🧪 Verificar Service Worker
                  </Text>
                </TouchableOpacity>
              )}

              {/* Botão para LIMPEZA TOTAL - Desregistra tudo e força refresh */}
              {Platform.OS === "web" && (
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: "#ef4444" }]}
                  onPress={async () => {
                    try {
                      console.log("🧹 LIMPEZA TOTAL - Removendo tudo...");

                      // 1. Limpa AsyncStorage
                      if (typeof window !== "undefined") {
                        const AsyncStorage = await import(
                          "@react-native-async-storage/async-storage"
                        ).then((m) => m.default);
                        await AsyncStorage.clear();
                        console.log("🗑️ AsyncStorage limpo");
                      }

                      // 2. Desregistra TODAS as subscriptions e Service Workers
                      if ("serviceWorker" in navigator) {
                        const registrations =
                          await navigator.serviceWorker.getRegistrations();
                        console.log(
                          `🗑️ Encontrados ${registrations.length} Service Workers`
                        );

                        for (const registration of registrations) {
                          // Desinscreve push subscription
                          const subscription =
                            await registration.pushManager.getSubscription();
                          if (subscription) {
                            await subscription.unsubscribe();
                            console.log("🗑️ Push subscription removida");
                          }

                          // Desregistra o Service Worker
                          await registration.unregister();
                          console.log("🗑️ Service Worker desregistrado");
                        }
                      }

                      Alert.alert(
                        "Limpeza Completa",
                        "✅ Todos os Service Workers e subscriptions foram removidos!\n\n🔄 A página será recarregada...",
                        [
                          {
                            text: "OK",
                            onPress: () => {
                              window.location.reload();
                            },
                          },
                        ]
                      );
                    } catch (error) {
                      console.error("Erro na limpeza:", error);
                      Alert.alert("Erro", `❌ Erro na limpeza: ${error}`);
                    }
                  }}
                >
                  <Text style={styles.testButtonText}>
                    🧹 LIMPEZA TOTAL (Reset SW)
                  </Text>
                </TouchableOpacity>
              )}

              {/* Botão para RE-REGISTRAR token com nova chave VAPID */}
              {Platform.OS === "web" && (
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: "#f59e0b" }]}
                  onPress={async () => {
                    try {
                      console.log("🔄 Forçando re-registro do token push...");

                      // Limpa registros antigos do AsyncStorage
                      if (typeof window !== "undefined") {
                        const AsyncStorage = await import(
                          "@react-native-async-storage/async-storage"
                        ).then((m) => m.default);
                        await AsyncStorage.removeItem("pushToken");
                        await AsyncStorage.removeItem("web_push_subscription");
                        console.log("🗑️ Tokens antigos removidos");
                      }

                      // Desregistra a subscription antiga do browser
                      if ("serviceWorker" in navigator) {
                        const registration =
                          await navigator.serviceWorker.ready;
                        const subscription =
                          await registration.pushManager.getSubscription();
                        if (subscription) {
                          await subscription.unsubscribe();
                          console.log(
                            "🗑️ Push subscription antiga removida"
                          );
                        }
                      }

                      // Força re-inicialização do serviço
                      await notificationService.initialize();

                      // Registra novo token com nova chave VAPID
                      await notificationService.registerPushToken();

                      // Pega o novo token gerado
                      const newToken = notificationService.getPushToken();

                      if (newToken) {
                        console.log("✅ Novo token gerado:", newToken);

                        // Envia o novo token para o backend
                        const result =
                          await notificationService.sendTokenToBackend(
                            newToken
                          );

                        if (result.success) {
                          Alert.alert(
                            "Re-registro Completo",
                            `✅ Token re-registrado com sucesso com nova chave VAPID!\n\nNovo endpoint: ${newToken.substring(
                              0,
                              60
                            )}...`
                          );
                        } else {
                          Alert.alert(
                            "Erro",
                            `❌ Token gerado mas falhou ao enviar: ${result.message}`
                          );
                        }
                      } else {
                        Alert.alert(
                          "Erro",
                          "❌ Não foi possível gerar novo token"
                        );
                      }
                    } catch (error) {
                      console.error("Erro ao re-registrar token:", error);
                      Alert.alert(
                        "Erro",
                        `❌ Erro ao re-registrar: ${error}`
                      );
                    }
                  }}
                >
                  <Text style={styles.testButtonText}>
                    🔄 Re-registrar Token VAPID
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: "#8b5cf6" }]}
                onPress={async () => {
                  try {
                    // Primeiro verifica se o serviço está inicializado
                    const isReady = notificationService.isReady();

                    if (!isReady) {
                      await notificationService.initialize();
                    }

                    const token = notificationService.getPushToken();

                    if (token) {
                      const result =
                        await notificationService.sendTokenToBackend(token);
                      Alert.alert(
                        "Token Push",
                        result.success
                          ? "✅ Token enviado com sucesso!"
                          : `❌ Erro: ${result.message}`
                      );
                    } else {
                      await notificationService.registerPushToken();

                      // Tenta pegar o token novamente após o registro
                      const newToken = notificationService.getPushToken();
                      if (newToken) {
                        const result =
                          await notificationService.sendTokenToBackend(
                            newToken
                          );
                        Alert.alert(
                          "Token Push",
                          result.success
                            ? "✅ Token enviado com sucesso!"
                            : `❌ Erro: ${result.message}`
                        );
                      } else {
                        Alert.alert(
                          "Token Push",
                          "❌ Não foi possível gerar token"
                        );
                      }
                    }
                  } catch (error) {
                    console.error("Erro ao enviar token:", error);
                    Alert.alert("Erro", `❌ Erro ao enviar token: ${error}`);
                  }
                }}
              >
                <Text style={styles.testButtonText}>📡 Enviar Token Push</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: "#f59e0b" }]}
                onPress={() => {
                  console.log("🧪 [MainApp] Botão de teste modal pressionado");
                  simulateDeliveryInvite();
                }}
              >
                <Text style={styles.testButtonText}>
                  🧪 Testar Modal de Convite
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: "#06b6d4" }]}
                onPress={async () => {
                  console.log(
                    "🔐 [MainApp] Verificando status das permissões..."
                  );
                  try {
                    const hasPermission =
                      await notificationService.requestPermissions();
                    Alert.alert(
                      "Permissões",
                      hasPermission
                        ? "✅ Permissões concedidas"
                        : "❌ Permissões negadas"
                    );
                  } catch (error) {
                    console.error("Erro ao verificar permissões:", error);
                    Alert.alert("Erro", "❌ Erro ao verificar permissões");
                  }
                }}
              >
                <Text style={styles.testButtonText}>
                  🔐 Verificar Permissões
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Debug info para desenvolvimento */}
          {__DEV__ && (
            <View style={[styles.testButton, { backgroundColor: "#374151" }]}>
              <Text style={[styles.testButtonText, { fontSize: 12 }]}>
                Debug: isDelivery={isDelivery ? "true" : "false"}, role=
                {user?.role}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.featuresContainer}>
          {isDelivery ? (
            // Features específicas para entregadores
            <>
              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => {
                  setCurrentScreen("available-rides");
                }}
              >
                <Text style={styles.featureIcon}>🚚</Text>
                <Text style={styles.featureTitle}>Entregas</Text>
                <Text style={styles.featureDescription}>
                  Aceite e gerencie suas entregas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => {
                  // TODO: Implementar navegação para rotas
                  console.log("Navegando para Rotas");
                }}
              >
                <Text style={styles.featureIcon}>🗺️</Text>
                <Text style={styles.featureTitle}>Rotas</Text>
                <Text style={styles.featureDescription}>
                  Navegue até o destino
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => {
                  // TODO: Implementar navegação para ganhos
                  console.log("Navegando para Ganhos");
                }}
              >
                <Text style={styles.featureIcon}>💰</Text>
                <Text style={styles.featureTitle}>Ganhos</Text>
                <Text style={styles.featureDescription}>
                  Acompanhe seus rendimentos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => {
                  // TODO: Implementar navegação para histórico
                  console.log("Navegando para Histórico");
                }}
              >
                <Text style={styles.featureIcon}>📊</Text>
                <Text style={styles.featureTitle}>Histórico</Text>
                <Text style={styles.featureDescription}>
                  Veja suas entregas passadas
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            // Features padrão para outros usuários
            <>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📦</Text>
                <Text style={styles.featureTitle}>Entregas</Text>
                <Text style={styles.featureDescription}>
                  Gerencie suas entregas e acompanhe o status
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🗺️</Text>
                <Text style={styles.featureTitle}>Mapa</Text>
                <Text style={styles.featureDescription}>
                  Visualize rotas e localizações
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📊</Text>
                <Text style={styles.featureTitle}>Relatórios</Text>
                <Text style={styles.featureDescription}>
                  Acompanhe métricas e performance
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>⚙️</Text>
                <Text style={styles.featureTitle}>Configurações</Text>
                <Text style={styles.featureDescription}>
                  Personalize suas preferências
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Versão 1.0.0 • Sistema autenticado ✅
          {isDelivery && " • Modo Entregador 🚚"}
        </Text>
      </View>

      {/* Modal de convite de entrega */}
      <RideInviteModal
        visible={showRideInvite}
        deliveryId={inviteDeliveryId}
        deliveryData={inviteDeliveryData}
        onAccept={handleRideInviteAccept}
        onReject={handleRideInviteReject}
        onClose={handleRideInviteClose}
        autoCloseTimer={30}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#1a1a2e",
    borderBottomWidth: 1,
    borderBottomColor: "#262640",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#e94560",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoEmoji: {
    fontSize: 20,
  },
  appName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  logoutButton: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#262640",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 4,
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#262640",
    alignItems: "center",
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 16,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  testButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
    alignSelf: "center",
  },
  testButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
