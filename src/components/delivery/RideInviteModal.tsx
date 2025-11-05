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
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    if (visible) {
      setTimeLeft(autoCloseTimer);
      startAnimation();
      startTimer();
    } else {
      resetAnimation();
    }
  }, [visible]);

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
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Limpa timer se componente desmontar
    return () => clearInterval(timer);
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
      console.log(`✋ Aceitando entrega ${deliveryId} via modal...`);

      const response = await deliveryService.acceptDelivery(deliveryId);

      if (response.success) {
        onAccept(deliveryId);
        onClose();
      } else {
        Alert.alert(
          "Erro",
          response.error || "Não foi possível aceitar a entrega"
        );
      }
    } catch (error) {
      console.error("❌ Erro ao aceitar entrega:", error);
      Alert.alert("Erro", "Erro de conexão. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (reason?: string) => {
    if (!deliveryId || isProcessing) return;

    setIsProcessing(true);

    try {
      console.log(`❌ Rejeitando entrega ${deliveryId}...`);

      const response = await deliveryService.rejectDelivery(deliveryId, reason);

      if (response.success) {
        onReject(deliveryId);
        onClose();
      } else {
        // Mesmo com erro, fecha o modal para não travar
        onReject(deliveryId);
        onClose();
      }
    } catch (error) {
      console.error("❌ Erro ao rejeitar entrega:", error);
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
    if (!deliveryData) return "Cliente não informado";

    return (
      deliveryData.clientName ||
      deliveryData.customerName ||
      deliveryData.userName ||
      deliveryData.client?.name ||
      deliveryData.user?.name ||
      "Cliente não informado"
    );
  };

  const getDeliveryValue = (): string => {
    if (!deliveryData) return "Valor não informado";

    const value =
      deliveryData.totalAmount ||
      deliveryData.value ||
      deliveryData.price ||
      deliveryData.amount ||
      deliveryData.total ||
      0;

    return typeof value === "number"
      ? `R$ ${value.toFixed(2).replace(".", ",")}`
      : `R$ ${value}`;
  };

  const getDeliveryAddress = (): string => {
    if (!deliveryData) return "Endereço não informado";

    return (
      deliveryData.toAddress ||
      deliveryData.address ||
      deliveryData.deliveryAddress ||
      deliveryData.destination ||
      deliveryData.location ||
      "Endereço não informado"
    );
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
