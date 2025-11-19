import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Modal,
  ScrollView,
  AppState,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { unifiedLocationService } from "../services/unifiedLocationService";
import { notificationService } from "../services/notificationService";
import { locationService } from "../services/locationService";
import { deliveryPollingService } from "../services/deliveryPollingService";
import AvailableRidesScreen from "./delivery/AvailableRidesScreen";
import ActiveDeliveryScreen from "./delivery/ActiveDeliveryScreen";
import RideInviteModal from "../components/delivery/RideInviteModal";
import GradientText from "../components/GradientText";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  gender?: string;
}

interface MainAppProps {
  user: User | null;
  onLogout: () => void;
}

type Screen = "dashboard" | "available-rides" | "active-ride";

export default function MainApp({ user, onLogout }: MainAppProps) {
  const [locationStatus, setLocationStatus] = useState<string>("Parado ⏸️");
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [showRideInvite, setShowRideInvite] = useState(false);
  const [inviteDeliveryId, setInviteDeliveryId] = useState<string | null>(null);
  const [inviteDeliveryData, setInviteDeliveryData] = useState<any>(null);
  const [showTestMenu, setShowTestMenu] = useState(false);
  const [mockLocationEnabled, setMockLocationEnabled] = useState(false);
  const [mockMovementEnabled, setMockMovementEnabled] = useState(false);
  const [useRealGPS, setUseRealGPS] = useState(false);
  const [locationTrackingActive, setLocationTrackingActive] = useState(false);
  const [deliveryPollingActive, setDeliveryPollingActive] = useState(false);
  const [hasActiveDelivery, setHasActiveDelivery] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Verifica se o usuário é entregador
  const userRole = user?.role?.toUpperCase() || "";
  const isDelivery = userRole === "COURIER";

  // Determina a saudação baseada no gênero
  const getGreeting = () => {
    const gender = user?.gender?.toUpperCase();
    console.log("🎯 [MainApp] Verificando gênero:", {
      userGender: user?.gender,
      genderUpperCase: gender,
      fullUser: user
    });
    
    if (gender === "MALE") {
      return "Bem-vindo";
    } else if (gender === "FEMALE") {
      return "Bem-vinda";
    }
    return "Bem-vindo(a)"; // Fallback caso não tenha gênero definido
  };

  // Inicia tracking de localização quando o componente monta
  useEffect(() => {
    // Reset dos estados do modal para garantir que não apareça inadvertidamente
    setShowRideInvite(false);
    setInviteDeliveryId(null);
    setInviteDeliveryData(null);

    // 🧹 LIMPEZA: Remove duplicatas do storage
    const cleanupDuplicates = async () => {
      try {
        console.log('🧹 Verificando e removendo duplicatas...');
        const removedCount = await deliveryPollingService.removeDuplicates();
        if (removedCount > 0) {
          console.log(`✅ ${removedCount} duplicata(s) removida(s)`);
        }
      } catch (error) {
        console.error('❌ Erro ao limpar duplicatas:', error);
      }
    };

    // 🔧 CORREÇÃO TEMPORÁRIA: Sincroniza entrega 22 com o backend
    const syncDelivery22 = async () => {
      try {
        console.log('🔄 ========== SINCRONIZANDO ENTREGA 22 ==========');
        
        // Primeiro, remove duplicatas
        await cleanupDuplicates();
        
        // Primeiro, verifica o que está no storage local
        const allDeliveries = await deliveryPollingService.loadAllDeliveriesFromStorage();
        const local22 = allDeliveries.find((d: any) => d.id === '22' || d.id === 22);
        console.log('📦 Entrega 22 no storage LOCAL:', local22 ? `Status: ${local22.status}` : 'NÃO ENCONTRADA');
        
        // Busca delivery do backend
        const { deliveryService } = require('../services/deliveryService');
        console.log('🌐 Buscando entrega 22 do BACKEND...');
        const response = await deliveryService.getDeliveryById('22');
        
        if (response.success && response.data) {
          console.log('✅ Entrega 22 no BACKEND:', {
            status: response.data.status,
            acceptedAt: response.data.acceptedAt,
            pickedUpAt: response.data.pickedUpAt
          });
          
          // Força atualização no storage com dados do backend
          await deliveryPollingService.updateDeliveryInStorage('22', response.data);
          
          // Verifica se atualizou
          const updatedDeliveries = await deliveryPollingService.loadAllDeliveriesFromStorage();
          const updated22 = updatedDeliveries.find((d: any) => d.id === '22' || d.id === 22);
          console.log('✅ Entrega 22 APÓS UPDATE:', updated22 ? `Status: ${updated22.status}` : 'NÃO ENCONTRADA');
          
          console.log('🔄 ========== SINCRONIZAÇÃO COMPLETA ==========');
        } else {
          console.log('⚠️ Entrega 22 não encontrada no backend:', response.error);
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar entrega 22:', error);
      }
    };
    
    // Executa com um pequeno delay para garantir que o storage está pronto
    setTimeout(() => {
      syncDelivery22();
    }, 1000);

    // NÃO inicia tracking automaticamente - usuário controla via toggle
    // startLocationTracking();

    // Sincroniza estado do mock com o serviço
    const isMockEnabled = locationService.isMockLocationEnabled();
    setMockLocationEnabled(isMockEnabled);
    setUseRealGPS(!isMockEnabled);
    if (isMockEnabled) {
      console.log('🎭 Mock já estava ativado (Expo Go detectado)');
    } else {
      console.log('📡 GPS Real detectado (App Standalone ou forçado)');
    }

    // Se for entregador, inicializa notificações (mas NÃO inicia polling automaticamente)
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

  // Monitora mudanças no estado do modal
  useEffect(() => {
    console.log('🔍 [MainApp] Estado do modal mudou:', {
      showRideInvite,
      inviteDeliveryId,
      hasDeliveryData: !!inviteDeliveryData,
      deliveryData: inviteDeliveryData
    });
  }, [showRideInvite, inviteDeliveryId, inviteDeliveryData]);

  // Registra callback de polling sempre que a função openInviteModal mudar
  useEffect(() => {
    if (!isDelivery) return;
    
    console.log(`🔄 [MainApp] Atualizando callback de polling... (hasActiveDelivery: ${hasActiveDelivery})`);
    deliveryPollingService.setOnNewDelivery(openInviteModal);
    
    return () => {
      // Cleanup: remove callback quando componente desmontar
      deliveryPollingService.setOnNewDelivery(() => {
        console.warn("⚠️ Callback de polling removido (componente desmontado)");
      });
    };
  }, [isDelivery, hasActiveDelivery]); // ← Adiciona hasActiveDelivery como dependência

  // Verifica se há entrega ativa ao montar e quando volta de background
  // IMPORTANTE: Executa ANTES de verificar novas entregas para evitar race condition
  useEffect(() => {
    if (!isDelivery) return;

    const checkActiveDeliveryAndPending = async () => {
      // 1. Primeiro verifica se já tem entrega ativa
      const hasAccepted = await deliveryPollingService.hasAcceptedDelivery();
      setHasActiveDelivery(hasAccepted);
      console.log(`� [MainApp] Entrega ativa detectada: ${hasAccepted}`);
      
      // 2. Só verifica novas entregas se NÃO houver entrega ativa
      if (!hasAccepted) {
        console.log('✅ [MainApp] Sem entrega ativa - verificando novas entregas...');
        deliveryPollingService.checkLatestPendingDelivery();
      } else {
        console.log('🚫 [MainApp] Já tem entrega ativa - não verifica novas entregas');
      }
    };

    // Verifica ao montar o componente
    checkActiveDeliveryAndPending();

    // Monitora mudanças no estado do app (foreground/background)
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 App voltou para foreground - verificando entrega ativa...');
        await checkActiveDeliveryAndPending();
      }
    });

    return () => {
      subscription.remove();
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

      // Inicializa o serviço (ativa mock automático no Expo Go)
      await unifiedLocationService.initialize();

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
        // Registra callback para quando receber convite de entrega
        console.log("📲 [MainApp] Registrando callback de delivery invite");
        notificationService.setOnDeliveryInvite((data) => {
          console.log("🚚 [MainApp] Callback de delivery invite chamado!", data);
          console.log("🚚 [MainApp] Abrindo modal de convite...");
          
          // Abre o modal com os dados da entrega
          setInviteDeliveryData(data);
          setInviteDeliveryId(data.deliveryId);
          setShowRideInvite(true);
          
          console.log("✅ [MainApp] Modal aberto com sucesso");
        });

        // Callback de polling é registrado no useEffect separado
        // (evita closure issues e garante que sempre use a versão mais recente de openInviteModal)
        
        // NÃO inicia polling automaticamente - usuário controla via toggle
        // deliveryPollingService.startPolling();

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

  // Função para abrir o modal de convite (separada para evitar closure issues)
  const openInviteModal = async (delivery: any) => {
    // SEMPRE verifica em tempo real se há entrega ativa (não depende de state)
    const hasAccepted = await deliveryPollingService.hasAcceptedDelivery();
    
    if (hasAccepted) {
      console.log('🚫 [MainApp] Popup bloqueado - motoboy já tem entrega ativa');
      console.log('📦 [MainApp] Entrega ignorada:', delivery.id);
      // Atualiza o state se estiver desatualizado
      if (!hasActiveDelivery) {
        setHasActiveDelivery(true);
        console.log('🔄 [MainApp] State hasActiveDelivery atualizado para true');
      }
      return;
    }
    
    console.log("🆕 [MainApp] Abrindo modal de convite para entrega:", delivery.id);
    console.log("� [MainApp] Tela atual:", currentScreen);
    console.log("�📦 [MainApp] Dados da entrega:", JSON.stringify(delivery, null, 2));
    
    // Força reset do modal antes de abrir novamente
    setShowRideInvite(false);
    setInviteDeliveryId(null);
    setInviteDeliveryData(null);
    
    // Aguarda próximo frame para garantir que o modal foi fechado
    setTimeout(() => {
      console.log("🔄 [MainApp] Definindo novos dados do modal...");
      console.log("📱 [MainApp] Ainda na tela:", currentScreen);
      setInviteDeliveryData(delivery);
      setInviteDeliveryId(delivery.id);
      setShowRideInvite(true);
      console.log("✅ [MainApp] Estados atualizados - showRideInvite=true");
    }, 100);
  };

  const handleRideInviteAccept = (deliveryId: string) => {
    console.log(`✅ [MainApp] Entrega ${deliveryId} ACEITA`);
    
    setShowRideInvite(false);
    setActiveDeliveryId(deliveryId);
    setCurrentScreen("active-ride");
    
    // Atualiza estado de entrega ativa
    setHasActiveDelivery(true);
  };

  const handleRideInviteReject = async (deliveryId: string) => {
    console.log(`❌ [MainApp] Entrega ${deliveryId} REJEITADA (apenas localmente)`);
    console.log('📝 A entrega continua aparecendo na lista de entregas disponíveis');
    console.log('🔒 Marcada como rejeitada indefinidamente (até ser aceita por outro motoboy)');
    
    // Marca como rejeitada (não mostra popup novamente, mas continua na lista)
    await deliveryPollingService.markAsRejected(deliveryId);
    
    console.log('🔒 [MainApp] Fechando modal após rejeição');
    setShowRideInvite(false);
    setInviteDeliveryId(null);
    setInviteDeliveryData(null);
    console.log('✅ [MainApp] Estados do modal resetados');
  };

  const handleRideInviteClose = () => {
    setShowRideInvite(false);
    setInviteDeliveryId(null);
    setInviteDeliveryData(null);
  };

  const handleRideSelect = (deliveryId: string) => {
    console.log(`🚚 Visualizando detalhes da entrega ${deliveryId}`);
    setActiveDeliveryId(deliveryId);
    setCurrentScreen("active-ride");
  };

  const handleBackToDashboard = async () => {
    setCurrentScreen("dashboard");
    setActiveDeliveryId(null);
    
    // Atualiza estado de entrega ativa ao voltar
    const hasAccepted = await deliveryPollingService.hasAcceptedDelivery();
    setHasActiveDelivery(hasAccepted);
  };

  // Componente de modal global (sempre renderizado)
  const GlobalModals = () => (
    <>
      {/* Modal de convite de entrega - sempre renderizado independente da tela */}
      <RideInviteModal
        visible={showRideInvite}
        deliveryId={inviteDeliveryId}
        deliveryData={inviteDeliveryData}
        onAccept={handleRideInviteAccept}
        onReject={handleRideInviteReject}
        onClose={handleRideInviteClose}
        autoCloseTimer={30}
      />
    </>
  );

  // Renderiza tela específica baseada no estado atual
  if (currentScreen === "available-rides") {
    console.log("🚚 Renderizando AvailableRidesScreen");
    return (
      <>
        <AvailableRidesScreen
          onRideSelect={handleRideSelect}
          onBack={handleBackToDashboard}
        />
        <GlobalModals />
      </>
    );
  }

  if (currentScreen === "active-ride") {
    if (!activeDeliveryId) {
      // Se não tem ID, volta para dashboard
      setCurrentScreen("dashboard");
      return null;
    }

    return (
      <>
        <ActiveDeliveryScreen
          deliveryId={activeDeliveryId}
          onBack={handleBackToDashboard}
          onComplete={handleBackToDashboard}
        />
        <GlobalModals />
      </>
    );
  }

  // Dashboard principal
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <GradientText style={styles.appName}>Zapi10</GradientText>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>
            {getGreeting()}, {user?.name || "Usuário"}! 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>Email: {user?.email}</Text>
          <Text style={styles.welcomeSubtitle}>
            Perfil: {user?.role?.toUpperCase() === "COURIER" ? "Motoboy" : user?.role}
          </Text>
          <Text style={styles.welcomeSubtitle}>
            📍 Localização: {locationStatus}
          </Text>

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
                style={[
                  styles.featureCard, 
                  { backgroundColor: hasActiveDelivery ? "#3b82f6" : "#10b981" }
                ]}
                onPress={async () => {
                  if (hasActiveDelivery) {
                    // Se tem entrega ativa, navega para ela
                    console.log("🚚 Navegando para entrega ativa...");
                    const activeDeliveries = await deliveryPollingService.getMyActiveDeliveries();
                    if (activeDeliveries.length > 0) {
                      const activeDelivery = activeDeliveries[0]; // Pega a primeira ACCEPTED
                      setActiveDeliveryId(activeDelivery.id);
                      setCurrentScreen("active-ride");
                    } else {
                      Alert.alert("Erro", "Entrega ativa não encontrada");
                    }
                  } else {
                    // Se não tem entrega ativa, busca nova
                    console.log("🔍 Verificando nova entrega...");
                    await deliveryPollingService.checkLatestPendingDelivery();
                    // Atualiza estado após verificar
                    const hasAccepted = await deliveryPollingService.hasAcceptedDelivery();
                    setHasActiveDelivery(hasAccepted);
                  }
                }}
              >
                <Text style={styles.featureIcon}>{hasActiveDelivery ? "🚚" : "🎁"}</Text>
                <Text style={[styles.featureTitle, { color: "#fff" }]}>
                  {hasActiveDelivery ? "Ver Entrega Ativa" : "Verificar Nova Entrega"}
                </Text>
                <Text style={[styles.featureDescription, { color: hasActiveDelivery ? "#dbeafe" : "#f0fdf4" }]}>
                  {hasActiveDelivery 
                    ? "Ir para entrega em andamento" 
                    : "Buscar entregas disponíveis agora"
                  }
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

      {/* Botão flutuante para abrir menu de testes */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setShowTestMenu(true)}
        >
          <Text style={styles.fabIcon}>🧪</Text>
        </TouchableOpacity>
      )}

      {/* Modal de menu de testes */}
      <Modal
        visible={showTestMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTestMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🧪 Menu de Testes</Text>
              <TouchableOpacity
                onPress={() => setShowTestMenu(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Testes Gerais */}
              <Text style={styles.sectionTitle}>📍 Localização</Text>
              
              {/* Toggle GPS Real vs Mock */}
              <TouchableOpacity
                style={[
                  styles.menuTestButton,
                  { backgroundColor: useRealGPS ? "#10b981" : "#f59e0b" }
                ]}
                onPress={async () => {
                  const newState = !useRealGPS;
                  setUseRealGPS(newState);
                  
                  if (newState) {
                    // Ativar GPS real
                    console.log('📡 Ativando GPS REAL do dispositivo...');
                    locationService.disableMockLocation();
                    setMockLocationEnabled(false);
                    setMockMovementEnabled(false);
                    
                    // Solicita permissões (forçando a solicitação)
                    const hasPermission = await locationService.requestPermissions(true);
                    if (!hasPermission) {
                      Alert.alert(
                        "⚠️ Permissões Necessárias",
                        "Para usar GPS real, você precisa conceder permissões de localização.\n\nVá em Configurações > Expo Go > Localização e ative."
                      );
                      // Volta para mock se não conseguir permissões
                      locationService.enableMockLocation(undefined, undefined, false);
                      setMockLocationEnabled(true);
                      setUseRealGPS(false);
                      return;
                    }
                    
                    Alert.alert("📡 GPS Real Ativado", "Usando localização real do dispositivo");
                  } else {
                    // Voltar para mock
                    console.log('🎭 Voltando para MOCK (Ubajara-CE)...');
                    locationService.enableMockLocation(undefined, undefined, false);
                    setMockLocationEnabled(true);
                    setMockMovementEnabled(false);
                    Alert.alert("🎭 Mock Ativado", "Usando localização simulada (Ubajara-CE)");
                  }
                }}
              >
                <Text style={styles.menuTestButtonText}>
                  {useRealGPS ? "📡 Usando GPS Real" : "🎭 Usando Mock (Ubajara-CE)"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuTestButton}
                onPress={() => {
                  unifiedLocationService.testGeolocation();
                  setShowTestMenu(false);
                }}
              >
                <Text style={styles.menuTestButtonText}>🧪 Testar Localização</Text>
              </TouchableOpacity>

              {/* Toggle de Tracking de Localização */}
              <TouchableOpacity
                style={[
                  styles.menuTestButton,
                  { backgroundColor: locationTrackingActive ? "#10b981" : "#ef4444" }
                ]}
                onPress={() => {
                  const newState = !locationTrackingActive;
                  setLocationTrackingActive(newState);
                  
                  if (newState) {
                    unifiedLocationService.startTracking();
                    Alert.alert("✅ Tracking Ativado", "Localização será enviada ao backend");
                  } else {
                    unifiedLocationService.stopTracking();
                    Alert.alert("⏸️ Tracking Pausado", "Localização NÃO será enviada");
                  }
                }}
              >
                <Text style={styles.menuTestButtonText}>
                  {locationTrackingActive ? "⏸️ Pausar Tracking" : "▶️ Ativar Tracking"}
                </Text>
              </TouchableOpacity>

              {/* Controle de Movimento (apenas quando mock está ativo) */}
              {mockLocationEnabled && !useRealGPS && (
                <TouchableOpacity
                  style={[
                    styles.menuTestButton,
                    { backgroundColor: mockMovementEnabled ? "#f59e0b" : "#10b981" }
                  ]}
                  onPress={() => {
                    const newMovementState = !mockMovementEnabled;
                    // Reativa o mock com o novo estado de movimento
                    locationService.enableMockLocation(undefined, undefined, newMovementState);
                    setMockMovementEnabled(newMovementState);
                    Alert.alert(
                      newMovementState ? "🏍️ Movimento Ativado" : "🛑 Movimento Pausado",
                      newMovementState 
                        ? "Motoboy se deslocando pela cidade (0-50m)" 
                        : "Motoboy parado (apenas GPS drift)"
                    );
                  }}
                >
                  <Text style={styles.menuTestButtonText}>
                    {mockMovementEnabled ? "🛑 Pausar Movimento" : "🏍️ Simular Movimento"}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Testes específicos para entregadores */}
              {isDelivery && (
                <>
                  <Text style={styles.sectionTitle}>🔔 Notificações & Entregas</Text>

                  <TouchableOpacity
                    style={[styles.menuTestButton, { backgroundColor: "#f97316" }]}
                    onPress={() => {
                      console.log("🧪 Testando Alert diretamente...");
                      Alert.alert(
                        "🧪 Teste de Alert",
                        "Se você está vendo este popup, o Alert está funcionando corretamente!",
                        [
                          { 
                            text: "Ver Detalhes", 
                            onPress: () => console.log("✅ Botão Ver Detalhes funcionou") 
                          },
                          { 
                            text: "Depois", 
                            style: "cancel",
                            onPress: () => console.log("❌ Botão Depois funcionou")
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.menuTestButtonText}>
                      🧪 Testar Alert Diretamente
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuTestButton, { backgroundColor: "#ec4899" }]}
                    onPress={() => {
                      console.log("========================================");
                      console.log("🚀 TESTE: Simulando callback de notificação");
                      console.log("========================================");
                      
                      const testData = {
                        type: 'delivery_invite' as const,
                        deliveryId: 'test-' + Date.now(),
                        message: 'Nova entrega disponível!',
                        data: {
                          pickup: 'Rua A, 123',
                          dropoff: 'Rua B, 456',
                          distance: '5 km',
                          payment: 'R$ 25,00'
                        }
                      };
                      
                      console.log("📦 Dados de teste:", JSON.stringify(testData, null, 2));
                      console.log("🎯 Definindo estados do modal...");
                      
                      setInviteDeliveryData(testData);
                      setInviteDeliveryId(testData.deliveryId);
                      setShowRideInvite(true);
                      
                      console.log("✅ Estados definidos:");
                      console.log("  - inviteDeliveryData:", testData);
                      console.log("  - inviteDeliveryId:", testData.deliveryId);
                      console.log("  - showRideInvite:", true);
                      console.log("========================================");
                      
                      setShowTestMenu(false);
                    }}
                  >
                    <Text style={styles.menuTestButtonText}>
                      🚀 Testar Modal Diretamente
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuTestButton, { backgroundColor: "#10b981" }]}
                    onPress={async () => {
                      console.log("🔔 Testando notificação LOCAL...");
                      try {
                        await notificationService.simulateDeliveryInvite(
                          "test-push-notification"
                        );
                        Alert.alert(
                          "✅ Notificação Local",
                          "Se você viu uma notificação, o sistema de notificações está funcionando!\n\nSe NÃO viu, verifique as permissões nas Configurações do iOS."
                        );
                        setShowTestMenu(false);
                      } catch (error) {
                        console.error("Erro ao enviar notificação de teste:", error);
                        Alert.alert("❌ Erro", `Falha ao testar: ${error}`);
                      }
                    }}
                  >
                    <Text style={styles.menuTestButtonText}>
                      🔔 Testar Notificação Local
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuTestButton, { backgroundColor: "#8b5cf6" }]}
                    onPress={() => {
                      console.log("⚡ Testando callback DIRETO de notificação...");
                      notificationService.simulateDirectDeliveryInvite("test-direct-" + Date.now());
                      setShowTestMenu(false);
                    }}
                  >
                    <Text style={styles.menuTestButtonText}>
                      ⚡ Testar Callback Direto
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuTestButton, { backgroundColor: "#dc2626" }]}
                    onPress={async () => {
                      console.log("🧪 Testando se listeners estão registrados...");
                      try {
                        const Notifications = require('expo-notifications').default;
                        
                        // Tenta enviar uma notificação agora (imediata)
                        await Notifications.scheduleNotificationAsync({
                          content: {
                            title: "🧪 Teste IMEDIATO",
                            body: "Se você viu LOGS no console, os listeners funcionam!",
                            data: { 
                              type: 'delivery_invite',
                              deliveryId: 'test-immediate-' + Date.now(),
                              test: true
                            },
                          },
                          trigger: null, // null = imediato
                        });
                        
                        console.log("✅ Notificação imediata enviada. Procure por logs do HANDLER e LISTENER!");
                        setShowTestMenu(false);
                      } catch (error) {
                        console.error("❌ Erro:", error);
                        Alert.alert("❌ Erro", String(error));
                      }
                    }}
                  >
                    <Text style={styles.menuTestButtonText}>
                      🧪 Testar Listeners
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuTestButton, { backgroundColor: "#3b82f6" }]}
                    onPress={async () => {
                      console.log("🔍 Verificando status de notificações...");
                      try {
                        const Notifications = require('expo-notifications').default;
                        const permissions = await Notifications.getPermissionsAsync();
                        const token = notificationService.getPushToken();
                        
                        let message = `📱 Status das Notificações:\n\n`;
                        message += `Permissões: ${permissions.status === 'granted' ? '✅ CONCEDIDAS' : '❌ NEGADAS'}\n`;
                        message += `Can Ask: ${permissions.canAskAgain ? 'Sim' : 'Não'}\n`;
                        message += `iOS Settings: ${permissions.ios ? JSON.stringify(permissions.ios) : 'N/A'}\n\n`;
                        message += `Token Push: ${token ? '✅ ' + token.substring(0, 40) + '...' : '❌ Não gerado'}\n`;
                        message += `Serviço: ${notificationService.isReady() ? '✅ Pronto' : '❌ Não inicializado'}`;
                        
                        console.log('📊 Status completo:', {
                          permissions,
                          token: token?.substring(0, 50),
                          ready: notificationService.isReady()
                        });
                        
                        Alert.alert("🔍 Status Notificações", message);
                      } catch (error) {
                        console.error("Erro ao verificar status:", error);
                        Alert.alert("❌ Erro", `${error}`);
                      }
                    }}
                  >
                    <Text style={styles.menuTestButtonText}>🔍 Ver Status Completo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuTestButton, { backgroundColor: "#8b5cf6" }]}
                    onPress={async () => {
                      try {
                        const isReady = notificationService.isReady();
                        if (!isReady) {
                          await notificationService.initialize();
                        }

                        const token = notificationService.getPushToken();
                        if (token) {
                          const result = await notificationService.sendTokenToBackend(token);
                          Alert.alert(
                            "Token Push",
                            result.success
                              ? `✅ Token enviado!\n\n${token.substring(0, 50)}...`
                              : `❌ Erro: ${result.message}`
                          );
                        } else {
                          await notificationService.registerPushToken();
                          const newToken = notificationService.getPushToken();
                          if (newToken) {
                            const result = await notificationService.sendTokenToBackend(newToken);
                            Alert.alert(
                              "Token Push",
                              result.success
                                ? `✅ Token enviado!\n\n${newToken.substring(0, 50)}...`
                                : `❌ Erro: ${result.message}`
                            );
                          } else {
                            Alert.alert("Token Push", "❌ Não foi possível gerar token");
                          }
                        }
                        setShowTestMenu(false);
                      } catch (error) {
                        console.error("Erro ao enviar token:", error);
                        Alert.alert("Erro", `❌ Erro ao enviar token: ${error}`);
                      }
                    }}
                  >
                    <Text style={styles.menuTestButtonText}>📡 Re-enviar Token Push</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuTestButton, { backgroundColor: "#06b6d4" }]}
                    onPress={async () => {
                      console.log("🔐 [MainApp] Verificando e solicitando permissões...");
                      try {
                        const hasPermission = await notificationService.requestPermissions();
                        Alert.alert(
                          "Permissões",
                          hasPermission 
                            ? "✅ Permissões CONCEDIDAS\n\nNotificações estão habilitadas!" 
                            : "❌ Permissões NEGADAS\n\nVá em Configurações > Notificações > Expo Go e ative!"
                        );
                        setShowTestMenu(false);
                      } catch (error) {
                        console.error("Erro ao verificar permissões:", error);
                        Alert.alert("Erro", "❌ Erro ao verificar permissões");
                      }
                    }}
                  >
                    <Text style={styles.menuTestButtonText}>🔐 Solicitar Permissões</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuTestButton, { backgroundColor: "#ef4444" }]}
                    onPress={async () => {
                      try {
                        console.log("🗑️ Removendo entrega #23 do storage local...");
                        await deliveryPollingService.removeDeliveryFromStorage(23);
                        Alert.alert(
                          "✅ Entrega Removida",
                          "Entrega #23 foi removida do storage local.\n\nAtualize a lista para ver as mudanças."
                        );
                        setShowTestMenu(false);
                      } catch (error) {
                        console.error("Erro ao remover entrega:", error);
                        Alert.alert("❌ Erro", `${error}`);
                      }
                    }}
                  >
                    <Text style={styles.menuTestButtonText}>🗑️ Remover Entrega #23</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuTestButton, { backgroundColor: "#dc2626" }]}
                    onPress={async () => {
                      Alert.alert(
                        "⚠️ Confirmar Limpeza",
                        "Isso vai apagar TODOS os dados offline:\n\n• Entregas em cache\n• Tokens salvos\n• Credenciais de login\n• Configurações locais\n\nDeseja continuar?",
                        [
                          {
                            text: "Cancelar",
                            style: "cancel"
                          },
                          {
                            text: "Limpar Tudo",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                console.log("🗑️ Limpando TODOS os dados offline...");
                                const AsyncStorage = await import("@react-native-async-storage/async-storage").then((m) => m.default);
                                
                                // Lista de chaves para limpar
                                const keys = [
                                  'userToken',
                                  'userData', 
                                  'savedEmail',
                                  'savedPassword',
                                  'pushToken',
                                  'web_push_subscription',
                                  'deliveries',
                                  'active_delivery_id',
                                  'location_tracking_active',
                                  'mock_location_enabled'
                                ];
                                
                                // Remove todas as chaves
                                await AsyncStorage.multiRemove(keys);
                                
                                console.log("✅ Cache limpo com sucesso!");
                                
                                Alert.alert(
                                  "✅ Cache Limpo",
                                  "Todos os dados offline foram apagados.\n\nO aplicativo será recarregado.",
                                  [
                                    {
                                      text: "OK",
                                      onPress: () => {
                                        setShowTestMenu(false);
                                        // Faz logout para recarregar o app
                                        setTimeout(() => onLogout(), 500);
                                      }
                                    }
                                  ]
                                );
                              } catch (error) {
                                console.error("❌ Erro ao limpar cache:", error);
                                Alert.alert("❌ Erro", `Erro ao limpar cache: ${error}`);
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.menuTestButtonText}>🧹 LIMPAR TODO CACHE</Text>
                  </TouchableOpacity>

                  <Text style={styles.sectionTitle}>🎭 UI/Modal</Text>

                  {/* Testes Web específicos */}
                  {Platform.OS === "web" && (
                    <>
                      <Text style={styles.sectionTitle}>🌐 Web (Service Worker)</Text>

                      <TouchableOpacity
                        style={[styles.menuTestButton, { backgroundColor: "#f97316" }]}
                        onPress={async () => {
                          try {
                            if ("serviceWorker" in navigator && "PushManager" in window) {
                              console.log("🧪 Testando Service Worker...");
                              const registration = await navigator.serviceWorker.ready;
                              console.log("✅ Service Worker ready:", registration);

                              const subscription = await registration.pushManager.getSubscription();
                              console.log("📧 Push Subscription:", subscription);

                              if (subscription) {
                                Alert.alert(
                                  "Service Worker Status",
                                  `✅ SW Ativo\n✅ Push Subscription Ativa\n\nEndpoint: ${subscription.endpoint.substring(0, 50)}...`
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
                            setShowTestMenu(false);
                          } catch (error) {
                            console.error("Erro ao verificar SW:", error);
                            Alert.alert("Erro", `❌ ${error}`);
                          }
                        }}
                      >
                        <Text style={styles.menuTestButtonText}>🧪 Verificar Service Worker</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.menuTestButton, { backgroundColor: "#f59e0b" }]}
                        onPress={async () => {
                          try {
                            console.log("🔄 Forçando re-registro do token push...");

                            if (typeof window !== "undefined") {
                              const AsyncStorage = await import("@react-native-async-storage/async-storage").then((m) => m.default);
                              await AsyncStorage.removeItem("pushToken");
                              await AsyncStorage.removeItem("web_push_subscription");
                              console.log("🗑️ Tokens antigos removidos");
                            }

                            if ("serviceWorker" in navigator) {
                              const registration = await navigator.serviceWorker.ready;
                              const subscription = await registration.pushManager.getSubscription();
                              if (subscription) {
                                await subscription.unsubscribe();
                                console.log("🗑️ Push subscription antiga removida");
                              }
                            }

                            await notificationService.initialize();
                            await notificationService.registerPushToken();

                            const newToken = notificationService.getPushToken();
                            if (newToken) {
                              console.log("✅ Novo token gerado:", newToken);
                              const result = await notificationService.sendTokenToBackend(newToken);

                              if (result.success) {
                                Alert.alert(
                                  "Re-registro Completo",
                                  `✅ Token re-registrado com sucesso com nova chave VAPID!\n\nNovo endpoint: ${newToken.substring(0, 60)}...`
                                );
                              } else {
                                Alert.alert("Erro", `❌ Token gerado mas falhou ao enviar: ${result.message}`);
                              }
                            } else {
                              Alert.alert("Erro", "❌ Não foi possível gerar novo token");
                            }
                            setShowTestMenu(false);
                          } catch (error) {
                            console.error("Erro ao re-registrar token:", error);
                            Alert.alert("Erro", `❌ Erro ao re-registrar: ${error}`);
                          }
                        }}
                      >
                        <Text style={styles.menuTestButtonText}>🔄 Re-registrar Token VAPID</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.menuTestButton, { backgroundColor: "#ef4444" }]}
                        onPress={async () => {
                          try {
                            console.log("🧹 LIMPEZA TOTAL - Removendo tudo...");

                            if (typeof window !== "undefined") {
                              const AsyncStorage = await import("@react-native-async-storage/async-storage").then((m) => m.default);
                              await AsyncStorage.clear();
                              console.log("🗑️ AsyncStorage limpo");
                            }

                            if ("serviceWorker" in navigator) {
                              const registrations = await navigator.serviceWorker.getRegistrations();
                              console.log(`🗑️ Encontrados ${registrations.length} Service Workers`);

                              for (const registration of registrations) {
                                const subscription = await registration.pushManager.getSubscription();
                                if (subscription) {
                                  await subscription.unsubscribe();
                                  console.log("🗑️ Push subscription removida");
                                }
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
                        <Text style={styles.menuTestButtonText}>🧹 LIMPEZA TOTAL (Reset SW)</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoImage: {
    width: 38,
    height: 38,
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
  fabButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#1a1a2e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#262640",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#262640",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#ffffff",
    fontWeight: "bold",
  },
  modalContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#94a3b8",
    marginTop: 16,
    marginBottom: 8,
  },
  menuTestButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  menuTestButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  mockInfoText: {
    color: "#fbbf24",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
});
