import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { deliveryService } from "../../services/deliveryService";

interface RideInviteModalProps {
  visible: boolean;
  deliveryId: string | null;
  deliveryData?: any;
  onAccept: (deliveryId: string) => void;
  onReject: (deliveryId: string) => void;
  onClose: () => void;
  autoCloseTimer?: number; // em segundos, padrão 30s
}

const { width } = Dimensions.get("window");

export default function RideInviteModal({
  visible,
  deliveryId,
  deliveryData,
  onAccept,
  onReject,
  onClose,
  autoCloseTimer = 30,
}: RideInviteModalProps) {
  const [timeLeft, setTimeLeft] = useState(autoCloseTimer);
  const [isProcessing, setIsProcessing] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      console.log('🔍 [RideInviteModal] Modal aberto:', {
        deliveryId,
        deliveryData,
        hasData: !!deliveryData,
        dataKeys: deliveryData ? Object.keys(deliveryData) : []
      });
      console.log(`📋 [RideInviteModal] Exibindo entrega ID: #${deliveryId}`);
      setTimeLeft(autoCloseTimer);
      startAnimation();
      startTimer();
    } else {
      resetAnimation();
      stopTimer();
    }

    // Cleanup: para o timer quando o modal fecha ou componente desmonta
    return () => {
      stopTimer();
    };
  }, [visible]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const resetAnimation = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
  };

  const startTimer = () => {
    // Para qualquer timer existente
    stopTimer();
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          handleAutoReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAutoReject = () => {
    if (deliveryId) {
      handleReject("Tempo esgotado");
    }
  };

  const handleAccept = async () => {
    if (!deliveryId || isProcessing) return;

    setIsProcessing(true);

    try {
      console.log(`✋ [RideInviteModal] Aceitando entrega ID: #${deliveryId}...`);

      const response = await deliveryService.acceptDelivery(deliveryId);

      if (response.success) {
        console.log(`✅ [RideInviteModal] Entrega #${deliveryId} aceita com sucesso!`);
        onAccept(deliveryId);
        onClose();
      } else {
        console.error(`❌ [RideInviteModal] Erro ao aceitar entrega #${deliveryId}:`, response.error);
        Alert.alert(
          "Erro",
          response.error || "Não foi possível aceitar a entrega"
        );
      }
    } catch (error) {
      console.error(`❌ [RideInviteModal] Exceção ao aceitar entrega #${deliveryId}:`, error);
      Alert.alert("Erro", "Erro de conexão. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reason?: string) => {
    if (!deliveryId || isProcessing) return;

    setIsProcessing(true);

    try {
      console.log(`❌ [RideInviteModal] Rejeitando entrega ID: #${deliveryId} (apenas localmente)...`);
      
      // Rejeição é apenas local - não envia nada para o backend
      onReject(deliveryId);
      onClose();
      
      console.log(`✅ [RideInviteModal] Entrega #${deliveryId} marcada como rejeitada localmente`);
    } catch (error) {
      console.error(`❌ [RideInviteModal] Erro ao rejeitar entrega #${deliveryId}:`, error);
      // Mesmo com erro, fecha o modal
      onReject(deliveryId);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReject = () => {
    Alert.alert(
      "Rejeitar Entrega",
      "Tem certeza que deseja rejeitar esta entrega?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Rejeitar",
          style: "destructive",
          onPress: () => handleReject("Rejeitado pelo entregador"),
        },
      ]
    );
  };

  // Funções helpers para extrair dados
  const getClientName = (): string => {
    if (!deliveryData) {
      return "Cliente não informado";
    }

    const name = deliveryData.clientName ||
      deliveryData.customerName ||
      deliveryData.userName ||
      deliveryData.client?.name ||
      deliveryData.user?.name ||
      deliveryData.recipientName || // Campo do backend
      "Cliente não informado";
    
    return name;
  };

  const getDeliveryValue = (): string => {
    if (!deliveryData) {
      return "Valor não informado";
    }

    const value =
      deliveryData.totalAmount ||
      deliveryData.value ||
      deliveryData.price ||
      deliveryData.amount ||
      deliveryData.total ||
      deliveryData.estimatedPayment || // Campo do backend
      0;

    const formatted = typeof value === "number"
      ? `R$ ${value.toFixed(2).replace(".", ",")}`
      : `R$ ${value}`;
    
    return formatted;
  };

  const getDeliveryAddress = (): string => {
    if (!deliveryData) {
      return "Endereço não informado";
    }

    const address = deliveryData.toAddress ||
      deliveryData.address ||
      deliveryData.deliveryAddress ||
      deliveryData.destination ||
      deliveryData.location ||
      deliveryData.dropoffAddress || // Campo do backend
      "Endereço não informado";
    
    return address;
  };

  const getTimerColor = (): string => {
    if (timeLeft > 20) return "#10b981"; // Verde
    if (timeLeft > 10) return "#f59e0b"; // Amarelo
    return "#ef4444"; // Vermelho
  };

  if (!visible || !deliveryId) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}
        >
          {/* Header com timer */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Text style={styles.iconEmoji}>🚚</Text>
            </View>
            <Text style={styles.headerTitle}>Nova Entrega Disponível!</Text>
            <View style={[styles.timer, { backgroundColor: getTimerColor() }]}>
              <Text style={styles.timerText}>{timeLeft}s</Text>
            </View>
          </View>

          {/* ID da Entrega */}
          <View style={styles.deliveryIdContainer}>
            <Text style={styles.deliveryIdLabel}>ID:</Text>
            <Text style={styles.deliveryIdValue}>#{deliveryId}</Text>
          </View>

          {/* Informações da entrega */}
          <View style={styles.content}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>👤 Cliente:</Text>
              <Text style={styles.infoValue}>{getClientName()}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>💰 Valor:</Text>
              <Text style={[styles.infoValue, styles.valueText]}>
                {getDeliveryValue()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📍 Endereço:</Text>
              <Text style={[styles.infoValue, styles.addressText]}>
                {getDeliveryAddress()}
              </Text>
            </View>
          </View>

          {/* Botões de ação */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.rejectButton,
                isProcessing && styles.buttonDisabled,
              ]}
              onPress={confirmReject}
              disabled={isProcessing}
            >
              <Text style={styles.rejectButtonText}>Rejeitar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                isProcessing && styles.buttonDisabled,
              ]}
              onPress={handleAccept}
              disabled={isProcessing}
            >
              <Text style={styles.acceptButtonText}>
                {isProcessing ? "Aceitando..." : "Aceitar"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Aviso do timer */}
          <Text style={styles.timerWarning}>
            Esta entrega será rejeitada automaticamente em {timeLeft} segundos
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 24,
    width: width - 40,
    maxWidth: 400,
    borderWidth: 2,
    borderColor: "#e94560",
    shadowColor: "#e94560",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e94560",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iconEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 12,
  },
  deliveryIdContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  deliveryIdLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginRight: 6,
  },
  deliveryIdValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#60a5fa",
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  timerText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    marginBottom: 24,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  valueText: {
    color: "#10b981",
    fontSize: 18,
    fontWeight: "bold",
  },
  addressText: {
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#374151",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    flex: 1,
    backgroundColor: "#e94560",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  timerWarning: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 16,
  },
});
