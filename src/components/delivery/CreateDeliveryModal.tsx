import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from '@react-native-picker/picker';
import { deliveryService } from "../../services/deliveryService";
import { authService } from "../../services/authService";
import { paymentService } from "../../services/paymentService";
import { DeliveryType } from "../../types/payment";

interface CreateDeliveryMopodalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (delivery: any) => void;
}

interface DeliveryFormData {
  itemDescription: string;
  recipientName: string;
  recipientPhone: string;
  fromAddress: string;
  fromLatitude: string;
  fromLongitude: string;
  toAddress: string;
  toLatitude: string;
  toLongitude: string;
  totalAmount: string;
  distanceKm: string;
  deliveryType: DeliveryType; // DELIVERY = entrega, RIDE = viagem
}

export default function CreateDeliveryModal({
  visible,
  onClose,
  onSuccess,
}: CreateDeliveryMopodalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<DeliveryFormData>({
    itemDescription: "",
    recipientName: "",
    recipientPhone: "",
    fromAddress: "",
    fromLatitude: "",
    fromLongitude: "",
    toAddress: "",
    toLatitude: "",
    toLongitude: "",
    totalAmount: "",
    distanceKm: "",
    deliveryType: "DELIVERY", // Default: entrega
  });

  // Reset form quando modal abre
  useEffect(() => {
    if (visible) {
      setFormData({
        itemDescription: "",
        recipientName: "",
        recipientPhone: "",
        fromAddress: "",
        fromLatitude: "",
        fromLongitude: "",
        toAddress: "",
        toLatitude: "",
        toLongitude: "",
        totalAmount: "",
        distanceKm: "",
        deliveryType: "DELIVERY",
      });
    }
  }, [visible]);

  const handleInputChange = (field: keyof DeliveryFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = async (): Promise<boolean> => {
    if (!formData.itemDescription.trim()) {
      Alert.alert("Erro", "Descrição do item é obrigatória");
      return false;
    }
    if (!formData.recipientName.trim()) {
      Alert.alert("Erro", "Nome do destinatário é obrigatório");
      return false;
    }
    if (!formData.recipientPhone.trim()) {
      Alert.alert("Erro", "Telefone do destinatário é obrigatório");
      return false;
    }
    if (!formData.fromAddress.trim()) {
      Alert.alert("Erro", "Endereço de coleta é obrigatório");
      return false;
    }
    if (!formData.toAddress.trim()) {
      Alert.alert("Erro", "Endereço de entrega é obrigatório");
      return false;
    }
    if (!formData.totalAmount.trim() || isNaN(Number(formData.totalAmount))) {
      Alert.alert("Erro", "Valor total é obrigatório e deve ser um número");
      return false;
    }

    // VALIDAÇÃO IMPORTANTE: RIDE requer cartão cadastrado
    if (formData.deliveryType === "RIDE") {
      try {
        const preference = await paymentService.getPaymentPreference();
        
        // Se preferência é PIX, não pode criar RIDE
        if (preference.preferredPaymentMethod === "PIX") {
          Alert.alert(
            "⚠️ RIDE Requer Cartão",
            "Viagens (RIDE) só podem ser pagas com cartão. Configure um cartão nas preferências de pagamento.",
            [{ text: "OK" }]
          );
          return false;
        }

        // Verifica se tem cartão default
        if (!preference.defaultCardId) {
          const hasCards = await paymentService.hasCards();
          if (!hasCards) {
            Alert.alert(
              "⚠️ Cartão Necessário",
              "Você precisa cadastrar um cartão para criar viagens (RIDE). Configure nas preferências de pagamento.",
              [{ text: "OK" }]
            );
            return false;
          }
        }
      } catch (error) {
        console.error("Erro ao validar preferência:", error);
        Alert.alert(
          "Erro",
          "Não foi possível validar sua preferência de pagamento. Tente novamente."
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    setLoading(true);
    try {
      // Busca o usuário atual para pegar o ID do cliente
      const user = await authService.getCurrentUser();
      
      if (!user || !user.id) {
        Alert.alert("Erro", "Usuário não autenticado");
        setLoading(false);
        return;
      }

      const deliveryData = {
        status: "PENDING",
        payments: [],
        client: user.id,
        itemDescription: formData.itemDescription.trim(),
        recipientName: formData.recipientName.trim(),
        recipientPhone: formData.recipientPhone.trim(),
        fromAddress: formData.fromAddress.trim(),
        fromLatitude: formData.fromLatitude ? parseFloat(formData.fromLatitude) : null,
        fromLongitude: formData.fromLongitude ? parseFloat(formData.fromLongitude) : null,
        toAddress: formData.toAddress.trim(),
        toLatitude: formData.toLatitude ? parseFloat(formData.toLatitude) : null,
        toLongitude: formData.toLongitude ? parseFloat(formData.toLongitude) : null,
        totalAmount: formData.totalAmount.trim(),
        distanceKm: formData.distanceKm ? parseFloat(formData.distanceKm) : null,
        deliveryType: formData.deliveryType, // DELIVERY ou RIDE
      };

      console.log("📦 Criando nova entrega:", deliveryData);
      
      const result = await deliveryService.createDelivery(deliveryData);

      if (result.success) {
        Alert.alert(
          "✅ Sucesso",
          "Entrega criada com sucesso! Um motoboy em breve irá aceitar sua solicitação.",
          [{ text: "OK", onPress: onClose }]
        );
        if (onSuccess && result.data) {
          onSuccess(result.data);
        }
      } else {
        Alert.alert("Erro", result.error || "Não foi possível criar a entrega");
      }
    } catch (error: any) {
      console.error("❌ Erro ao criar entrega:", error);
      Alert.alert("Erro", "Ocorreu um erro ao criar a entrega. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nova Entrega</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Seção: Tipo de Serviço */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚗 Tipo de Serviço</Text>
            
            <View style={styles.deliveryTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.deliveryTypeButton,
                  formData.deliveryType === 'DELIVERY' && styles.deliveryTypeButtonActive
                ]}
                onPress={() => handleInputChange('deliveryType', 'DELIVERY')}
              >
                <Ionicons 
                  name="cube-outline" 
                  size={32} 
                  color={formData.deliveryType === 'DELIVERY' ? '#0f0f23' : '#666'}
                />
                <Text style={[
                  styles.deliveryTypeLabel,
                  formData.deliveryType === 'DELIVERY' && styles.deliveryTypeLabelActive
                ]}>
                  📦 Entrega
                </Text>
                <Text style={styles.deliveryTypeHint}>
                  Pago quando motoboy aceita
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deliveryTypeButton,
                  formData.deliveryType === 'RIDE' && styles.deliveryTypeButtonActive
                ]}
                onPress={() => handleInputChange('deliveryType', 'RIDE')}
              >
                <Ionicons 
                  name="car-outline" 
                  size={32} 
                  color={formData.deliveryType === 'RIDE' ? '#0f0f23' : '#666'}
                />
                <Text style={[
                  styles.deliveryTypeLabel,
                  formData.deliveryType === 'RIDE' && styles.deliveryTypeLabelActive
                ]}>
                  🚗 Viagem
                </Text>
                <Text style={styles.deliveryTypeHint}>
                  Pago quando motorista inicia
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info box sobre pagamento */}
            {formData.deliveryType === 'RIDE' && (
              <View style={styles.rideInfoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
                <Text style={styles.rideInfoText}>
                  Viagens só podem ser pagas com cartão. Certifique-se de ter um cartão cadastrado.
                </Text>
              </View>
            )}
          </View>

          {/* Seção: Informações do Item */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Informações do Item</Text>
            
            <Text style={styles.label}>Descrição do Item *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Caixa com documentos, Encomenda pequena..."
              placeholderTextColor="#9ca3af"
              value={formData.itemDescription}
              onChangeText={(text) => handleInputChange("itemDescription", text)}
              multiline
            />
          </View>

          {/* Seção: Destinatário */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Destinatário</Text>
            
            <Text style={styles.label}>Nome do Destinatário *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor="#9ca3af"
              value={formData.recipientName}
              onChangeText={(text) => handleInputChange("recipientName", text)}
            />

            <Text style={styles.label}>Telefone do Destinatário *</Text>
            <TextInput
              style={styles.input}
              placeholder="(XX) XXXXX-XXXX"
              placeholderTextColor="#9ca3af"
              value={formData.recipientPhone}
              onChangeText={(text) => handleInputChange("recipientPhone", text)}
              keyboardType="phone-pad"
            />
          </View>

          {/* Seção: Endereço de Coleta */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Endereço de Coleta (Origem)</Text>
            
            <Text style={styles.label}>Endereço Completo *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Rua, número, bairro, cidade - estado"
              placeholderTextColor="#9ca3af"
              value={formData.fromAddress}
              onChangeText={(text) => handleInputChange("fromAddress", text)}
              multiline
              numberOfLines={2}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="-3.855221"
                  placeholderTextColor="#9ca3af"
                  value={formData.fromLatitude}
                  onChangeText={(text) => handleInputChange("fromLatitude", text)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="-40.917016"
                  placeholderTextColor="#9ca3af"
                  value={formData.fromLongitude}
                  onChangeText={(text) => handleInputChange("fromLongitude", text)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Seção: Endereço de Entrega */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏁 Endereço de Entrega (Destino)</Text>
            
            <Text style={styles.label}>Endereço Completo *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Rua, número, bairro, cidade - estado"
              placeholderTextColor="#9ca3af"
              value={formData.toAddress}
              onChangeText={(text) => handleInputChange("toAddress", text)}
              multiline
              numberOfLines={2}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="-3.906429"
                  placeholderTextColor="#9ca3af"
                  value={formData.toLatitude}
                  onChangeText={(text) => handleInputChange("toLatitude", text)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  placeholder="-40.895018"
                  placeholderTextColor="#9ca3af"
                  value={formData.toLongitude}
                  onChangeText={(text) => handleInputChange("toLongitude", text)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Seção: Valores */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💰 Valores</Text>
            
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Valor Total (R$) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  value={formData.totalAmount}
                  onChangeText={(text) => handleInputChange("totalAmount", text)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Distância (km)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor="#9ca3af"
                  value={formData.distanceKm}
                  onChangeText={(text) => handleInputChange("distanceKm", text)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Botão de Enviar */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Criar Entrega</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            * Campos obrigatórios. Coordenadas são opcionais mas ajudam na localização.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#334155",
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#374151",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  disclaimer: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
  },
  deliveryTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  deliveryTypeButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    gap: 8,
  },
  deliveryTypeButtonActive: {
    borderColor: '#10b981',
    backgroundColor: '#1e293b',
  },
  deliveryTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
  deliveryTypeLabelActive: {
    color: '#fff',
  },
  deliveryTypeHint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  rideInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  rideInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#bfdbfe',
    lineHeight: 18,
  },
});
