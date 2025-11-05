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

type Screen = 'dashboard' | 'available-rides' | 'active-ride';

export default function MainApp({ user, onLogout }: MainAppProps) {
  const [locationStatus, setLocationStatus] = useState<string>("Não iniciado");
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [showRideInvite, setShowRideInvite] = useState(false);
  const [inviteDeliveryId, setInviteDeliveryId] = useState<string | null>(null);
  const [inviteDeliveryData, setInviteDeliveryData] = useState<any>(null);

  // Verifica se o usuário é entregador
  const isDelivery = user?.role?.toLowerCase() === 'delivery' || 
                     user?.role?.toLowerCase() === 'courier' ||
                     user?.role?.toLowerCase() === 'entregador';

  // Inicia tracking de localização quando o componente monta
  useEffect(() => {
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
      console.log('🔔 Inicializando notificações para entregador...');
      const success = await notificationService.initialize();
      
      if (success) {
        console.log('✅ Notificações inicializadas com sucesso');
        
        // Teste de notificação para desenvolvimento
        if (__DEV__) {
          setTimeout(() => {
            simulateDeliveryInvite();
          }, 5000);
        }
      } else {
        console.log('⚠️ Falha ao inicializar notificações');
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar notificações:', error);
    }
  };

  const simulateDeliveryInvite = () => {
    if (__DEV__ && isDelivery) {
      setInviteDeliveryId('test-delivery-123');
      setInviteDeliveryData({
        clientName: 'João Silva',
        value: 25.50,
        address: 'Rua das Flores, 123 - Centro, São Paulo - SP'
      });
      setShowRideInvite(true);
    }
  };
  const handleRideInviteAccept = (deliveryId: string) => {
    console.log(`✅ Entrega ${deliveryId} aceita via modal`);
    setShowRideInvite(false);
    setCurrentScreen('active-ride');
  };

  const handleRideInviteReject = (deliveryId: string) => {
    console.log(`❌ Entrega ${deliveryId} rejeitada via modal`);
    setShowRideInvite(false);
  };

  const handleRideInviteClose = () => {
    setShowRideInvite(false);
    setInviteDeliveryId(null);
    setInviteDeliveryData(null);
  };

  const handleRideSelect = (deliveryId: string) => {
    console.log(`🚚 Visualizando detalhes da entrega ${deliveryId}`);
    setCurrentScreen('active-ride');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
  };

  // Renderiza tela específica baseada no estado atual
  if (currentScreen === 'available-rides') {
    return (
      <AvailableRidesScreen
        onRideSelect={handleRideSelect}
        onBack={handleBackToDashboard}
      />
    );
  }

  if (currentScreen === 'active-ride') {
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
    console.log("🔴 Botão Sair pressionado");

    // Para o tracking de localização antes do logout
    await unifiedLocationService.stopTracking();

    // Logout direto para testar (sem Alert)
    console.log("🔴 Fazendo logout direto");
    onLogout();

    // Versão com Alert (descomente se quiser testar)
    /*
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sair", 
        style: "destructive", 
        onPress: () => {
          console.log("🔴 Confirmou logout, chamando onLogout");
          onLogout();
        }
      },
    ]);
    */
  };

  );
  }

  const handleLogout = async () => {
    console.log("🔴 Botão Sair pressionado");

    // Para o tracking de localização antes do logout
    await unifiedLocationService.stopTracking();
    
    // Para notificações se for entregador
    if (isDelivery) {
      await notificationService.unregisterPushToken();
      notificationService.destroy();
    }

    // Logout direto para testar (sem Alert)
    console.log("🔴 Fazendo logout direto");
    onLogout();

    // Versão com Alert (descomente se quiser testar)
    /*
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sair", 
        style: "destructive", 
        onPress: () => {
          console.log("🔴 Confirmou logout, chamando onLogout");
          onLogout();
        }
      },
    ]);
    */
  };

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
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#e94560' }]}
              onPress={() => setCurrentScreen('available-rides')}
            >
              <Text style={styles.testButtonText}>🚚 Ver Entregas Disponíveis</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.featuresContainer}>
          {isDelivery ? (
            // Features específicas para entregadores
            <>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🚚</Text>
                <Text style={styles.featureTitle}>Entregas</Text>
                <Text style={styles.featureDescription}>
                  Aceite e gerencie suas entregas
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🗺️</Text>
                <Text style={styles.featureTitle}>Rotas</Text>
                <Text style={styles.featureDescription}>
                  Navegue até o destino
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>💰</Text>
                <Text style={styles.featureTitle}>Ganhos</Text>
                <Text style={styles.featureDescription}>
                  Acompanhe seus rendimentos
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>�</Text>
                <Text style={styles.featureTitle}>Histórico</Text>
                <Text style={styles.featureDescription}>
                  Veja suas entregas passadas
                </Text>
              </View>
            </>
          ) : (
            // Features padrão para outros usuários
            <>
              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>�📦</Text>
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
          {isDelivery && ' • Modo Entregador 🚚'}
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

  const handleLogout = async () => {
    console.log("🔴 Botão Sair pressionado");

    // Para o tracking de localização antes do logout
    await unifiedLocationService.stopTracking();
    
    // Para notificações se for entregador
    if (isDelivery) {
      await notificationService.unregisterPushToken();
      notificationService.destroy();
    }

    // Logout direto para testar (sem Alert)
    console.log("🔴 Fazendo logout direto");
    onLogout();

    // Versão com Alert (descomente se quiser testar)
    /*
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Sair", 
        style: "destructive", 
        onPress: () => {
          console.log("🔴 Confirmou logout, chamando onLogout");
          onLogout();
        }
      },
    ]);
    */
  };

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
