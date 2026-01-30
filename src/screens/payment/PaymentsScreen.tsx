import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import {
  paymentService,
  PaymentItem,
  PaymentReport,
  SplitItem,
} from "../../services/paymentService";

const { width } = Dimensions.get("window");

// Traduz role para português
const translateRole = (role: string): string => {
  const translations: Record<string, string> = {
    COURIER: "Motoboy",
    PLATFORM: "Plataforma",
    ORGANIZER: "Organizador",
    CLIENT: "Cliente",
  };
  return translations[role.toUpperCase()] || role;
};

interface PaymentsScreenProps {
  onBack: () => void;
}

export default function PaymentsScreen({ onBack }: PaymentsScreenProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedPaymentForQR, setSelectedPaymentForQR] = useState<PaymentItem | null>(null);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PaymentReport | null>(null);

  // Carrega pagamentos
  const loadPayments = useCallback(async (page: number = 0, append: boolean = false) => {
    if (page === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await paymentService.getPayments(page, 10);

      if (result.success && result.data) {
        if (append) {
          setPayments(prev => [...prev, ...result.data!.content]);
        } else {
          setPayments(result.data.content);
        }
        setTotalPages(result.data.totalPages);
        setCurrentPage(page);
      } else {
        if (!append) {
          Alert.alert("Erro", result.error || "Não foi possível carregar os pagamentos");
        }
      }
    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  // Carrega na montagem
  useEffect(() => {
    loadPayments(0);
  }, [loadPayments]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayments(0);
  }, [loadPayments]);

  // Carrega mais páginas
  const loadMore = useCallback(() => {
    if (!loadingMore && currentPage < totalPages - 1) {
      loadPayments(currentPage + 1, true);
    }
  }, [currentPage, totalPages, loadingMore, loadPayments]);

  // Abre modal de QR Code
  const handleShowQRCode = (payment: PaymentItem) => {
    setSelectedPaymentForQR(payment);
    setShowQRModal(true);
  };

  // Abre modal de relatório
  const handleShowReport = async (paymentId: number) => {
    setReportLoading(true);
    setShowReportModal(true);

    try {
      const result = await paymentService.getPaymentReport(paymentId);

      if (result.success && result.data) {
        setSelectedReport(result.data);
      } else {
        Alert.alert("Erro", result.error || "Não foi possível carregar o relatório");
        setShowReportModal(false);
      }
    } catch (error) {
      Alert.alert("Erro", "Erro ao carregar relatório");
      setShowReportModal(false);
    } finally {
      setReportLoading(false);
    }
  };

  // Renderiza item da lista
  const renderPaymentItem = ({ item }: { item: PaymentItem }) => {
    const statusColors = paymentService.getStatusColor(item.status);

    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={styles.paymentIdContainer}>
            <Text style={styles.paymentId}>Pagamento #{item.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {paymentService.translateStatus(item.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.paymentAmount}>
            {paymentService.formatCurrency(item.amount)}
          </Text>
        </View>

        <Text style={styles.paymentDate}>
          {paymentService.formatDate(item.createdAt)}
        </Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.qrButton]}
            onPress={() => handleShowQRCode(item)}
          >
            <Ionicons name="qr-code-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.reportButton]}
            onPress={() => handleShowReport(item.id)}
          >
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Relatório</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Renderiza lista vazia
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
      <Text style={styles.emptyText}>Nenhum pagamento encontrado</Text>
      <Text style={styles.emptySubtext}>
        Seus pagamentos aparecerão aqui
      </Text>
    </View>
  );

  // Renderiza footer da lista (loading mais)
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#7c3aed" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Pagamentos</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Carregando pagamentos...</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#7c3aed"]}
              tintColor="#7c3aed"
            />
          }
          ListEmptyComponent={renderEmptyList}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Modal QR Code */}
      <Modal
        visible={showQRModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                QR Code - Pagamento #{selectedPaymentForQR?.id}
              </Text>
              <TouchableOpacity
                onPress={() => setShowQRModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              {selectedPaymentForQR?.pixQrCode ? (
                <QRCode
                  value={selectedPaymentForQR.pixQrCode}
                  size={200}
                  backgroundColor="#fff"
                />
              ) : (
                <View style={styles.noQrContainer}>
                  <Ionicons name="qr-code-outline" size={64} color="#d1d5db" />
                  <Text style={styles.noQrText}>QR Code não disponível</Text>
                </View>
              )}
            </View>

            {selectedPaymentForQR?.pixQrCode && (
              <View style={styles.pixCopyContainer}>
                <Text style={styles.pixCopyLabel}>Código Pix Copia e Cola:</Text>
                <Text style={styles.pixCopyText} numberOfLines={3}>
                  {selectedPaymentForQR.pixQrCode}
                </Text>
              </View>
            )}

            <View style={styles.qrInfoContainer}>
              <Text style={styles.qrInfoLabel}>Valor:</Text>
              <Text style={styles.qrInfoValue}>
                {paymentService.formatCurrency(selectedPaymentForQR?.amount || 0)}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Relatório */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <SafeAreaView style={styles.reportModalContainer} edges={["top"]}>
          <View style={styles.reportModalHeader}>
            <TouchableOpacity
              onPress={() => setShowReportModal(false)}
              style={styles.reportCloseButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.reportModalTitle}>
              Relatório de Pagamento #{selectedReport?.paymentId}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {reportLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={styles.loadingText}>Carregando relatório...</Text>
            </View>
          ) : selectedReport ? (
            <ScrollView
              style={styles.reportContent}
              contentContainerStyle={styles.reportScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Cabeçalho do Relatório */}
              <View style={styles.reportHeaderCard}>
                <Text style={styles.reportDate}>
                  {paymentService.formatDate(selectedReport.createdAt)}
                </Text>
                <View style={styles.reportSummary}>
                  <View style={styles.reportSummaryItem}>
                    <Text style={styles.reportSummaryLabel}>Status</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: paymentService.getStatusColor(
                            selectedReport.status
                          ).bg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: paymentService.getStatusColor(
                              selectedReport.status
                            ).text,
                          },
                        ]}
                      >
                        {paymentService.translateStatus(selectedReport.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reportSummaryItem}>
                    <Text style={styles.reportSummaryLabel}>Valor Total</Text>
                    <Text style={styles.reportTotalAmount}>
                      {paymentService.formatCurrency(selectedReport.totalAmount)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Distribuição do Pagamento */}
              <View style={styles.reportSection}>
                <View style={styles.reportSectionHeader}>
                  <Ionicons name="cash-outline" size={20} color="#7c3aed" />
                  <Text style={styles.reportSectionTitle}>
                    Distribuição do Pagamento
                  </Text>
                </View>

                <View style={styles.distributionTable}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>
                      Recebedor
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>
                      Papel
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>
                      %
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>
                      Valor
                    </Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>
                      Taxas
                    </Text>
                  </View>

                  {selectedReport.consolidatedSplits.map((split, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text
                        style={[styles.tableCell, { flex: 2 }]}
                        numberOfLines={1}
                      >
                        {split.recipientName}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>
                        {translateRole(split.recipientRole)}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>
                        {split.percentage.toFixed(1)}%
                      </Text>
                      <Text style={[styles.tableCellAmount, { flex: 1.2 }]}>
                        {paymentService.formatCurrency(split.amount)}
                      </Text>
                      <View style={[styles.tableCellBadge, { flex: 0.8 }]}>
                        <View
                          style={[
                            styles.taxBadge,
                            {
                              backgroundColor: split.liable
                                ? "#d1fae5"
                                : "#fee2e2",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.taxBadgeText,
                              { color: split.liable ? "#059669" : "#dc2626" },
                            ]}
                          >
                            {split.liable ? "Sim" : "Não"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Entregas Incluídas */}
              <View style={styles.reportSection}>
                <View style={styles.reportSectionHeader}>
                  <Ionicons name="cube-outline" size={20} color="#7c3aed" />
                  <Text style={styles.reportSectionTitle}>
                    Entregas Incluídas ({selectedReport.deliveries.length})
                  </Text>
                </View>

                {selectedReport.deliveries.map((delivery, index) => (
                  <View key={index} style={styles.deliveryCard}>
                    <View style={styles.deliveryHeader}>
                      <Text style={styles.deliveryTitle}>
                        Entrega #{delivery.deliveryId}
                      </Text>
                      <Text style={styles.deliveryAmount}>
                        {paymentService.formatCurrency(delivery.shippingFee)}
                      </Text>
                    </View>

                    <View style={styles.deliveryInfo}>
                      <View style={styles.deliveryInfoRow}>
                        <Text style={styles.deliveryInfoLabel}>Cliente</Text>
                        <Text style={styles.deliveryInfoValue}>
                          {delivery.clientName}
                        </Text>
                      </View>
                      <View style={styles.deliveryInfoRow}>
                        <Text style={styles.deliveryInfoLabel}>Origem</Text>
                        <Text style={styles.deliveryInfoValue} numberOfLines={2}>
                          {delivery.pickupAddress}
                        </Text>
                      </View>
                      <View style={styles.deliveryInfoRow}>
                        <Text style={styles.deliveryInfoLabel}>Destino</Text>
                        <Text style={styles.deliveryInfoValue} numberOfLines={2}>
                          {delivery.deliveryAddress}
                        </Text>
                      </View>
                    </View>

                    {/* Divisão desta entrega */}
                    <View style={styles.deliveryDistribution}>
                      <Text style={styles.deliveryDistTitle}>
                        Divisão desta entrega
                      </Text>
                      {delivery.splits.map((split, splitIndex) => (
                        <View key={splitIndex} style={styles.deliveryDistRow}>
                          <Text style={styles.deliveryDistName}>
                            {split.recipientName} ({translateRole(split.recipientRole)})
                          </Text>
                          <Text style={styles.deliveryDistAmount}>
                            {paymentService.formatCurrency(split.amount)} (
                            {split.percentage.toFixed(1)}%)
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#7c3aed",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  paymentIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#059669",
  },
  paymentDate: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  qrButton: {
    backgroundColor: "#7c3aed",
  },
  reportButton: {
    backgroundColor: "#0ea5e9",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  // Modal QR Code
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: width - 40,
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  qrContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
  },
  noQrContainer: {
    alignItems: "center",
    padding: 20,
  },
  noQrText: {
    marginTop: 12,
    fontSize: 14,
    color: "#9ca3af",
  },
  pixCopyContainer: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  pixCopyLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  pixCopyText: {
    fontSize: 11,
    color: "#374151",
    fontFamily: "monospace",
  },
  qrInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  qrInfoLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  qrInfoValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#059669",
  },
  // Modal Relatório
  reportModalContainer: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  reportModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  reportCloseButton: {
    padding: 4,
  },
  reportModalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  reportContent: {
    flex: 1,
  },
  reportScrollContent: {
    padding: 16,
  },
  reportHeaderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reportDate: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  reportSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportSummaryItem: {
    alignItems: "center",
  },
  reportSummaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  reportTotalAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#059669",
  },
  reportSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reportSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
  },
  distributionTable: {
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    alignItems: "center",
  },
  tableCell: {
    fontSize: 13,
    color: "#374151",
  },
  tableCellAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
  },
  tableCellBadge: {
    alignItems: "center",
  },
  taxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  taxBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  deliveryCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  deliveryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
  },
  deliveryAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0ea5e9",
  },
  deliveryInfo: {
    marginBottom: 12,
  },
  deliveryInfoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  deliveryInfoLabel: {
    width: 60,
    fontSize: 12,
    color: "#6b7280",
  },
  deliveryInfoValue: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
  },
  deliveryDistribution: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  deliveryDistTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  deliveryDistRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  deliveryDistName: {
    fontSize: 12,
    color: "#374151",
    flex: 1,
  },
  deliveryDistAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
});
