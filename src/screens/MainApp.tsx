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
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { PanResponder } from 'react-native';
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { unifiedLocationService } from "../services/unifiedLocationService";
import { notificationService } from "../services/notificationService";
import { fcmService } from "../services/fcmService";
import { locationService } from "../services/locationService";
import { deliveryPollingService } from "../services/deliveryPollingService";
import { deliveryService } from "../services/deliveryService";
import { userLocationService } from "../services/userLocationService";
import AvailableRidesScreen from "./delivery/AvailableRidesScreen";
import ActiveDeliveryScreen from "./delivery/ActiveDeliveryScreen";
import CreateDeliveryScreen from "./delivery/CreateDeliveryScreen";
import PaymentsScreen from "./payment/PaymentsScreen";
import BankAccountScreen from "./BankAccountScreen";
import RideInviteModal from "../components/delivery/RideInviteModal";
import CreateDeliveryModal from "../components/delivery/CreateDeliveryModal";
import GradientText from "../components/GradientText";
import SideMenu from "../components/SideMenu";
import MyGroupScreen from "./group/MyGroupScreen";
import MyClientsScreen from "./clients/MyClientsScreen";
import ENV from "../config/env";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

type Screen = "dashboard" | "available-rides" | "active-ride" | "bank-account" | "create-delivery" | "payments" | "my-group" | "my-clients";

export default function MainApp({ user, onLogout }: MainAppProps) {
  const insets = useSafeAreaInsets();
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
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCreateDeliveryModal, setShowCreateDeliveryModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapView>(null);
  const locationInitializedRef = useRef(false);
  const edgeOpenResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Só começa se o toque iniciar próximo à borda esquerda e movimento horizontal para direita
        const startX = evt.nativeEvent.pageX;
        return startX <= 24 && gestureState.dx > 10 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: () => {},
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > 30) {
          setShowSideMenu(true);
        }
      },
    })
  ).current;

  // Função para abrir o modal com localização do usuário
  const handleOpenLocationModal = async () => {
    setShowLocationModal(true);
    setLoadingLocation(true);
    
    try {
      const result = await userLocationService.getCurrentUserLocation();
      
      if (result.success && result.latitude && result.longitude) {
        setUserLocation({
          latitude: result.latitude,
          longitude: result.longitude
        });
        console.log('📍 Localização do usuário carregada:', result.latitude, result.longitude);
      } else {
        console.log('⚠️ Sem localização salva no banco');
        Alert.alert('Aviso', 'Localização não disponível no servidor.');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar localização:', error);
      Alert.alert('Erro', 'Não foi possível carregar a localização.');
    } finally {
      setLoadingLocation(false);
    }
  };

  // Verifica se o usuário é entregador
  const userRole = user?.role?.toUpperCase() || "";
  const isDelivery = userRole === "COURIER";
  const isClient = userRole === "CLIENT";
  const isOrganizer = userRole === "ORGANIZER";

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

    // Executa limpeza de duplicatas ao montar
    cleanupDuplicates();

    // Inicia tracking de localização automaticamente para entregadores
    if (isDelivery) {
      console.log('🚀 Iniciando tracking de localização para entregador...');
      startLocationTracking();
    }

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
  // NOTA: Verificação de entregas PENDENTES foi REMOVIDA da inicialização
  // Agora só verifica pendentes via botão "Verificar Nova Entrega" ou via Push Notification
  useEffect(() => {
    if (!isDelivery) return;

    const checkActiveDeliveryOnly = async () => {
      // Apenas verifica se já tem entrega ativa (NÃO verifica pendentes automaticamente)
      const hasAccepted = await deliveryPollingService.hasAcceptedDelivery();
      setHasActiveDelivery(hasAccepted);
      console.log(`📦 [MainApp] Entrega ativa detectada: ${hasAccepted}`);
      
      // REMOVIDO: Verificação automática de entregas pendentes
      // Agora o usuário precisa clicar em "Verificar Nova Entrega" ou receber push
      if (hasAccepted) {
        console.log('🚫 [MainApp] Já tem entrega ativa');
      } else {
        console.log('✅ [MainApp] Sem entrega ativa - aguardando push ou clique no botão');
      }
    };

    // Verifica ao montar o componente
    checkActiveDeliveryOnly();

    // Monitora mudanças no estado do app (foreground/background)
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 App voltou para foreground - verificando entrega ativa...');
        await checkActiveDeliveryOnly();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isDelivery]);

  const startLocationTracking = async () => {
    try {
      // Evita inicializar múltiplas vezes
      if (locationInitializedRef.current) {
        console.log('⚠️ Localização já foi inicializada, pulando...');
        return;
      }
      locationInitializedRef.current = true;

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

      // Inicializa FCM primeiro
      if (Platform.OS !== 'web') {
        console.log("📱 [MainApp] Inicializando FCM...");
        const fcmToken = await fcmService.getToken();
        
        if (fcmToken && user?.id) {
          await fcmService.sendTokenToBackend(user.id);
          
          // Setup FCM listeners
          fcmService.setupNotificationListeners(async (message) => {
            console.log("🚚 [MainApp] FCM Message recebido:", message);
            
            // Exibe notificação local para mostrar banner em foreground
            const title = message.notification?.title || '🚚 Nova Notificação';
            const body = message.notification?.body || 'Você recebeu uma nova mensagem';
            
            // Mostra notificação visual mesmo em foreground
            await notificationService.sendLocalNotification(title, body, message.data);
            
            // Expo Push envia o data como JSON string no campo body
            // Precisamos parsear para obter type e deliveryId
            let parsedData = message.data;
            if (message.data?.body && typeof message.data.body === 'string') {
              try {
                const bodyData = JSON.parse(message.data.body);
                parsedData = { ...message.data, ...bodyData };
                console.log("📦 [MainApp] Data parseado do body:", parsedData);
              } catch (e) {
                console.log("⚠️ [MainApp] Não foi possível parsear body como JSON");
              }
            }
            
            // Processa notificação de convite de entrega
            if (parsedData?.type === 'delivery_invite' && parsedData.deliveryId) {
              console.log("🚀 [MainApp] Processando delivery_invite - buscando dados completos...");
              console.log("📦 [MainApp] DeliveryId da notificação:", parsedData.deliveryId);
              
              // Verifica se esta entrega já foi rejeitada
              const rejectedIds = await deliveryPollingService.getRejectedDeliveryIds();
              if (rejectedIds.includes(parsedData.deliveryId)) {
                console.log("🚫 [MainApp] Entrega já foi rejeitada, ignorando push:", parsedData.deliveryId);
                return;
              }
              
              try {
                // Busca dados completos da entrega no backend
                const response = await deliveryService.getDeliveryById(parsedData.deliveryId);
                
                if (response.success && response.data) {
                  const deliveryData = Array.isArray(response.data) ? response.data[0] : response.data;
                  console.log("✅ [MainApp] Dados completos da entrega obtidos:", deliveryData.id);
                  setInviteDeliveryData(deliveryData);
                  setInviteDeliveryId(deliveryData.id);
                  setShowRideInvite(true);
                } else {
                  console.error("❌ [MainApp] Erro ao buscar entrega:", response.error);
                  // Fallback: usa dados parciais da notificação
                  setInviteDeliveryData(parsedData);
                  setInviteDeliveryId(parsedData.deliveryId);
                  setShowRideInvite(true);
                }
              } catch (error) {
                console.error("❌ [MainApp] Exceção ao buscar entrega:", error);
                // Fallback: usa dados parciais da notificação
                setInviteDeliveryData(parsedData);
                setInviteDeliveryId(parsedData.deliveryId);
                setShowRideInvite(true);
              }
            }
          });
        }
      }

      const success = await notificationService.initialize();

      if (success) {
        // Registra callback para quando receber convite de entrega
        console.log("📲 [MainApp] Registrando callback de delivery invite");
        notificationService.setOnDeliveryInvite(async (data) => {
          console.log("🚚 [MainApp] Callback de delivery invite chamado!", data);
          
          // Verifica se esta entrega já foi rejeitada
          const rejectedIds = await deliveryPollingService.getRejectedDeliveryIds();
          if (data.deliveryId && rejectedIds.includes(data.deliveryId)) {
            console.log("🚫 [MainApp] Entrega já foi rejeitada, ignorando callback:", data.deliveryId);
            return;
          }
          
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
    // Verifica se esta entrega já foi rejeitada (normaliza ID para string)
    const deliveryIdStr = String(delivery.id);
    const rejectedIds = await deliveryPollingService.getRejectedDeliveryIds();
    console.log(`📋 [MainApp] IDs rejeitados: ${rejectedIds.join(', ') || 'nenhum'}`);
    console.log(`📋 [MainApp] ID da entrega: ${deliveryIdStr} (tipo: ${typeof delivery.id})`);
    
    if (delivery.id && rejectedIds.includes(deliveryIdStr)) {
      console.log('🚫 [MainApp] Popup bloqueado - entrega já foi rejeitada:', deliveryIdStr);
      return;
    }
    
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

  const handleRideInviteAccept = async (deliveryId: string) => {
    console.log(`✅ [MainApp] Entrega ${deliveryId} ACEITA`);
    
    try {
      // Salva em cache de ativas (remove de pendentes se estava lá)
      const deliveryToSave = {
        id: deliveryId,
        ...inviteDeliveryData
      };
      await deliveryPollingService.acceptDelivery(deliveryId, deliveryToSave);
      console.log(`📦 Entrega ${deliveryId} salva em cache de ativas`);
    } catch (error) {
      console.error(`❌ Erro ao aceitar entrega:`, error);
    }
    
    setShowRideInvite(false);
    setActiveDeliveryId(deliveryId);
    setCurrentScreen("active-ride");
    
    // Atualiza estado de entrega ativa
    setHasActiveDelivery(true);
  };

  const handleRideInviteReject = async (deliveryId: string) => {
    console.log(`❌ [MainApp] Entrega ${deliveryId} REJEITADA`);
    console.log('📝 A entrega será marcada como rejeitada no cache');
    
    try {
      // Marca como rejeitada no cache (persiste indefinidamente)
      await deliveryPollingService.markAsRejected(deliveryId);
      console.log(`✅ Entrega ${deliveryId} marcada como rejeitada`);
    } catch (error) {
      console.error(`❌ Erro ao rejeitar entrega:`, error);
    }
    
    console.log('🔒 [MainApp] Fechando modal após rejeição');
    setShowRideInvite(false);
    setInviteDeliveryId(null);
    setInviteDeliveryData(null);
    console.log('✅ [MainApp] Estados do modal resetados');
  };;

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

  const handleShowBankAccount = () => {
    setCurrentScreen("bank-account");
    setShowSideMenu(false);
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
      
      {/* Modal de localização do usuário */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.locationModalOverlay}>
          <View style={styles.locationModalContent}>
            <View style={styles.locationModalHeader}>
              <Text style={styles.locationModalTitle}>📍 Sua Localização</Text>
              <TouchableOpacity
                onPress={() => setShowLocationModal(false)}
                style={styles.locationModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {loadingLocation ? (
              <View style={styles.locationModalLoading}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={styles.locationModalLoadingText}>Carregando localização...</Text>
              </View>
            ) : userLocation ? (
              <View style={styles.locationModalMapContainer}>
                <MapView
                  ref={mapRef}
                  style={styles.locationModalMap}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={{
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    }}
                    title={user?.name || "Você"}
                    description="Sua localização atual"
                  >
                    <View style={styles.locationMarker}>
                      <View style={styles.locationMarkerDot} />
                    </View>
                  </Marker>
                </MapView>
                <View style={styles.locationModalCoords}>
                  <Text style={styles.locationModalCoordsText}>
                    Lat: {userLocation.latitude.toFixed(6)}
                  </Text>
                  <Text style={styles.locationModalCoordsText}>
                    Lng: {userLocation.longitude.toFixed(6)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.locationModalNoData}>
                <Ionicons name="location-outline" size={48} color="#ccc" />
                <Text style={styles.locationModalNoDataText}>
                  Localização não disponível
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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

  if (currentScreen === "bank-account") {
    console.log("🏦 Renderizando BankAccountScreen");
    return (
      <>
        <BankAccountScreen
          userId={user?.id || ""}
          onBack={handleBackToDashboard}
          onMenuOpen={() => setShowSideMenu(true)}
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

  if (currentScreen === "create-delivery") {
    return (
      <>
        <CreateDeliveryScreen
          onBack={handleBackToDashboard}
          onSuccess={(delivery) => {
            console.log("✅ Entrega criada com sucesso:", delivery?.id);
            handleBackToDashboard();
          }}
        />
        <GlobalModals />
      </>
    );
  }

  if (currentScreen === "payments") {
    return (
      <>
        <PaymentsScreen onBack={handleBackToDashboard} />
        <GlobalModals />
      </>
    );
  }

  if (currentScreen === "my-group") {
    return (
      <>
        <MyGroupScreen onBack={handleBackToDashboard} />
        <GlobalModals />
      </>
    );
  }

  if (currentScreen === "my-clients") {
    return (
      <>
        <MyClientsScreen onBack={handleBackToDashboard} />
        <GlobalModals />
      </>
    );
  }

  // Dashboard principal
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Área de gesto para abrir menu pela borda esquerda */}
      <View style={styles.edgeSwipeArea} {...edgeOpenResponder.panHandlers} />

      {/* Header com botão do menu */}
      <View style={[
        styles.header,
        Platform.OS === 'android' && { paddingTop: RNStatusBar.currentHeight || 0 }
      ]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowSideMenu(true)}
        >
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zapi10</Text>
        <View style={styles.menuButton} />
      </View>

      {/* Side Menu */}
      {user && (
        <SideMenu
          visible={showSideMenu}
          onClose={() => setShowSideMenu(false)}
          user={user}
          onLogout={onLogout}
          onShowBankAccount={handleShowBankAccount}
        />
      )}

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>
            {getGreeting()}, {user?.name || "Usuário"}! 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>Email: {user?.email}</Text>
          <Text style={styles.welcomeSubtitle}>
            Perfil: {isDelivery ? "Motoboy 🏍️" : isOrganizer ? "Gerente 👔" : isClient ? "Cliente 📦" : user?.role}
          </Text>
          <TouchableOpacity onPress={handleOpenLocationModal} style={styles.locationRow}>
            <Text style={styles.welcomeSubtitle}>
              📍 Localização: {locationStatus}
            </Text>
            <Ionicons name="map-outline" size={20} color="#7c3aed" style={styles.mapIcon} />
          </TouchableOpacity>
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
                  {hasActiveDelivery ? "Abra Sua Entrega Ativa" : "Verificar Nova Entrega"}
                </Text>
                <Text style={[styles.featureDescription, { color: hasActiveDelivery ? "#dbeafe" : "#f0fdf4" }]}>
                  {hasActiveDelivery 
                    ? "Ir para entrega em andamento" 
                    : "Buscar entregas disponíveis agora"
                  }
                </Text>
              </TouchableOpacity>
            </>
          ) : isClient ? (
            // Features para usuários CLIENT - podem criar entregas
            <>
              <TouchableOpacity 
                style={[styles.featureCard, { backgroundColor: "#10b981" }]}
                onPress={() => setCurrentScreen("create-delivery")}
              >
                <Text style={styles.featureIcon}>➕</Text>
                <Text style={[styles.featureTitle, { color: "#fff" }]}>Criar Nova Entrega</Text>
                <Text style={[styles.featureDescription, { color: "#f0fdf4" }]}>
                  Solicite um motoboy para sua entrega
                </Text>
              </TouchableOpacity>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📦</Text>
                <Text style={styles.featureTitle}>Minhas Entregas</Text>
                <Text style={styles.featureDescription}>
                  Acompanhe suas entregas solicitadas
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>🗺️</Text>
                <Text style={styles.featureTitle}>Mapa</Text>
                <Text style={styles.featureDescription}>
                  Visualize rotas e localizações
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.featureCard, { backgroundColor: "#7c3aed" }]}
                onPress={() => setCurrentScreen("payments")}
              >
                <Text style={styles.featureIcon}>💳</Text>
                <Text style={[styles.featureTitle, { color: "#fff" }]}>Pagamentos</Text>
                <Text style={[styles.featureDescription, { color: "#e9d5ff" }]}>
                  Veja seus pagamentos e QR Codes
                </Text>
              </TouchableOpacity>
            </>
          ) : isOrganizer ? (
            // Features para usuários ORGANIZER - gerenciam grupos de motoboys
            <>
              <TouchableOpacity 
                style={[styles.featureCard, { backgroundColor: "#7c3aed" }]}
                onPress={() => setCurrentScreen("my-group")}
              >
                <Text style={styles.featureIcon}>👥</Text>
                <Text style={[styles.featureTitle, { color: "#fff" }]}>Meu Grupo</Text>
                <Text style={[styles.featureDescription, { color: "#e9d5ff" }]}>
                  Gerencie seus motoboys
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.featureCard, { backgroundColor: "#10b981" }]}
                onPress={() => setCurrentScreen("my-clients")}
              >
                <Text style={styles.featureIcon}>🏢</Text>
                <Text style={[styles.featureTitle, { color: "#fff" }]}>Meus Clientes</Text>
                <Text style={[styles.featureDescription, { color: "#f0fdf4" }]}>
                  Gerencie seus clientes
                </Text>
              </TouchableOpacity>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📦</Text>
                <Text style={styles.featureTitle}>Entregas</Text>
                <Text style={styles.featureDescription}>
                  Acompanhe entregas do grupo
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureIcon}>📊</Text>
                <Text style={styles.featureTitle}>Relatórios</Text>
                <Text style={styles.featureDescription}>
                  Métricas e performance do grupo
                </Text>
              </View>
            </>
          ) : (
            // Features padrão para outros usuários (ADMIN, etc)
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

      <View style={[styles.footer, Platform.OS === 'android' && { paddingBottom: insets.bottom + 16 }]}>
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

      {/* Modal de criar nova entrega (para CLIENT) */}
      <CreateDeliveryModal
        visible={showCreateDeliveryModal}
        onClose={() => setShowCreateDeliveryModal(false)}
        onSuccess={(delivery) => {
          console.log("✅ Entrega criada:", delivery);
          setShowCreateDeliveryModal(false);
        }}
      />

      {/* Botão flutuante para abrir menu de testes */}
      {__DEV__ && (
        <TouchableOpacity
          style={[
            styles.fabButton,
            Platform.OS === 'android' && { bottom: insets.bottom + 32 },
          ]}
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
                                  'mock_location_enabled',
                                  'my_pending_deliveries_cache',
                                  'my_active_deliveries_cache',
                                  'my_completed_deliveries_cache',
                                  'rejected_deliveries'
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

      <GlobalModals />
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
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
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
  edgeSwipeArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
    zIndex: 1,
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
  // Estilos para a linha de localização clicável
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapIcon: {
    marginLeft: 8,
  },
  // Estilos para o modal de localização
  locationModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  locationModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  locationModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  locationModalCloseButton: {
    padding: 4,
  },
  locationModalLoading: {
    padding: 40,
    alignItems: "center",
  },
  locationModalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  locationModalMapContainer: {
    height: 350,
  },
  locationModalMap: {
    flex: 1,
  },
  locationModalCoords: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    backgroundColor: "#f5f5f5",
  },
  locationModalCoordsText: {
    fontSize: 12,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  locationModalNoData: {
    padding: 40,
    alignItems: "center",
  },
  locationModalNoDataText: {
    marginTop: 12,
    fontSize: 14,
    color: "#999",
  },
  locationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  locationMarkerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#7c3aed",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
