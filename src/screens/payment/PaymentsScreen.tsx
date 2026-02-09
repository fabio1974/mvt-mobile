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

// Status de pagamento para filtros
type PaymentStatus = 'ALL' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';

// Configuração dos filtros
const STATUS_FILTERS = [
  { key: 'ALL' as PaymentStatus, label: 'Todos', icon: 'list-outline' },
  { key: 'PENDING' as PaymentStatus, label: 'Pendentes', icon: 'time-outline' },
  { key: 'PAID' as PaymentStatus, label: 'Pagos', icon: 'checkmark-circle-outline' },
  { key: 'FAILED' as PaymentStatus, label: 'Falhados', icon: 'close-circle-outline' },
  { key: 'EXPIRED' as PaymentStatus, label: 'Expirados', icon: 'alert-circle-outline' },
];

export default function PaymentsScreen({ onBack }: PaymentsScreenProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filtro por status
  const [activeFilter, setActiveFilter] = useState<PaymentStatus>('ALL');

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

  // Filtra pagamentos localmente por status
  const filteredPayments = activeFilter === 'ALL' 
    ? payments 
    : payments.filter(p => p.status === activeFilter);

  // Quando mudar o filtro, volta para o topo
  const handleFilterChange = (filter: PaymentStatus) => {
    setActiveFilter(filter);
  };

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
    const isPending = item.status === 'PENDING';
    const isPaid = item.status === 'PAID';
    
    // Ícone do status
    const getStatusIcon = () => {
      switch (item.status) {
        case 'PENDING': return 'time-outline';
        case 'PAID': return 'checkmark-circle-outline';
        case 'FAILED': return 'close-circle-outline';
        case 'EXPIRED': return 'alert-circle-outline';
        default: return 'help-circle-outline';
      }
    };

    return (
      <View style={[styles.paymentCard, isPaid && styles.cardActive]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardId}>#{item.id}</Text>
            <Text style={styles.cardDate}>{paymentService.formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Ionicons name={getStatusIcon() as any} size={14} color={statusColors.text} />
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {paymentService.translateStatus(item.status)}
            </Text>
          </View>
        </View>

        {/* Valor e Info */}
        <View style={styles.amountSection}>
          <View style={styles.amountChip}>
            <Ionicons name="cash-outline" size={16} color="#10b981" />
            <Text style={styles.amountValue}>
              {paymentService.formatCurrency(item.amount)}
            </Text>
          </View>
        </View>

        {/* Método de Pagamento */}
        <View style={styles.infoGrid}>
          <View style={styles.infoChip}>
            <Ionicons name={item.paymentMethod === 'PIX' ? 'qr-code-outline' : 'card-outline'} size={13} color="#94a3b8" />
            <Text style={styles.infoChipText}>{item.paymentMethod}</Text>
          </View>
          {item.recipientRole && (
            <View style={styles.infoChip}>
              <Ionicons name="person-outline" size={13} color="#94a3b8" />
              <Text style={styles.infoChipText}>
                {item.recipientRole === 'COURIER' ? 'Motoboy' : 
                 item.recipientRole === 'ORGANIZER' ? 'Organizador' : 
                 item.recipientRole === 'PLATFORM' ? 'Plataforma' : item.recipientRole}
              </Text>
            </View>
          )}
        </View>

        {/* Ações */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShowQRCode(item)}
          >
            <Ionicons name="qr-code-outline" size={16} color="#93c5fd" />
            <Text style={styles.actionButtonText}>QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShowReport(item.id)}
          >
            <Ionicons name="document-text-outline" size={16} color="#93c5fd" />
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

      {/* Tabs de Filtro por Status */}
      {!loading && (
        <View style={styles.tabsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {STATUS_FILTERS.map(filter => {
              const count = filter.key === 'ALL' 
                ? payments.length 
                : payments.filter(p => p.status === filter.key).length;
              const isActive = activeFilter === filter.key;
              
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => handleFilterChange(filter.key)}
                >
                  <Ionicons 
                    name={filter.icon as any} 
                    size={18} 
                    color={isActive ? '#fff' : '#9ca3af'} 
                  />
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {filter.label}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.badge, isActive && styles.badgeActive]}>
                      <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Carregando pagamentos...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPayments}
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
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#1f2937",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  // ---- Card ----
  paymentCard: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardActive: {
    borderColor: "#10b981",
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardHeaderLeft: {
    gap: 2,
  },
  cardId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e2e8f0",
  },
  cardDate: {
    fontSize: 12,
    color: "#64748b",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // ---- Amount Section ----
  amountSection: {
    marginBottom: 12,
  },
  amountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10b981",
  },
  // ---- Info Grid ----
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0f172a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  infoChipText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  // ---- Actions ----
  cardActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#93c5fd",
  },
  // ---- Unused old styles ----
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
  qrButton: {
    backgroundColor: "#7c3aed",
  },
  reportButton: {
    backgroundColor: "#0ea5e9",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#e2e8f0",
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
  tabsContainer: {
    backgroundColor: "#1f2937",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#374151",
    gap: 6,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: "#7c3aed",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
  },
  tabLabelActive: {
    color: "#fff",
  },
  badge: {
    backgroundColor: "#4b5563",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  badgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#d1d5db",
  },
  badgeTextActive: {
    color: "#fff",
  },
});
