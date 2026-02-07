import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import { deliveryService } from '../../services/deliveryService';
import { freightService } from '../../services/freightService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TIPOS
// ============================================

interface Delivery {
  id: number;
  createdAt: string;
  status: string;
  fromAddress: string;
  fromCity?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toAddress: string;
  toCity?: string;
  toLatitude?: number;
  toLongitude?: number;
  recipientName: string;
  recipientPhone: string;
  itemDescription?: string;
  totalAmount: number;
  shippingFee: number;
  distanceKm: number;
  deliveryType?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  courier?: {
    id: string;
    name: string;
    phone: string;
  };
  payments?: Array<{ id: number; status: string }>;
}

type StatusFilter = 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

interface MyDeliveriesScreenProps {
  onBack: () => void;
}

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  PENDING: { label: 'Pendente', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', icon: 'time-outline' },
  ACCEPTED: { label: 'Aceita', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: 'checkmark-circle-outline' },
  PICKED_UP: { label: 'Coletada', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)', icon: 'cube-outline' },
  IN_TRANSIT: { label: 'Em Trânsito', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.15)', icon: 'bicycle-outline' },
  COMPLETED: { label: 'Concluída', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: 'checkmark-done-outline' },
  CANCELLED: { label: 'Cancelada', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', icon: 'close-circle-outline' },
};

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'IN_TRANSIT', label: 'Em Andamento' },
  { key: 'COMPLETED', label: 'Concluídas' },
  { key: 'CANCELLED', label: 'Canceladas' },
];

// ============================================
// COMPONENTE
// ============================================

export default function MyDeliveriesScreen({ onBack }: MyDeliveriesScreenProps) {
  const insets = useSafeAreaInsets();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('PENDING');
  const [currentPage, setCurrentPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalElements, setTotalElements] = useState(0);

  // Detail modal
  const [detailDelivery, setDetailDelivery] = useState<Delivery | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const detailMapRef = useRef<MapView>(null);

  // ---- Fetch ----
  const fetchDeliveries = useCallback(async (page: number = 0, filter: StatusFilter = activeFilter, append: boolean = false) => {
    if (page === 0) {
      if (!append) setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const params: any = { page, size: 20 };
    // "Em Andamento" busca sem filtro de status e filtra localmente
    if (filter !== 'IN_TRANSIT') {
      params.status = filter;
    }

    const result = await deliveryService.getClientDeliveries(params);

    if (result.success && result.data) {
      let filtered = result.data as Delivery[];

      // Filtro local para "Em Andamento" (ACCEPTED + PICKED_UP + IN_TRANSIT)
      if (filter === 'IN_TRANSIT') {
        filtered = filtered.filter(d =>
          d.status === 'ACCEPTED' || d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT'
        );
      }

      if (append && page > 0) {
        setDeliveries(prev => [...prev, ...filtered]);
      } else {
        setDeliveries(filtered);
      }
      setCurrentPage(result.currentPage ?? page);
      setIsLastPage(result.last ?? true);
      setTotalElements(result.totalElements ?? filtered.length);
    }

    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [activeFilter]);

  useEffect(() => {
    fetchDeliveries(0, activeFilter);
  }, [activeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(0);
    fetchDeliveries(0, activeFilter);
  };

  const handleLoadMore = () => {
    if (!isLastPage && !loadingMore && !loading) {
      fetchDeliveries(currentPage + 1, activeFilter, true);
    }
  };

  const handleFilterChange = (filter: StatusFilter) => {
    setActiveFilter(filter);
    setCurrentPage(0);
    setDeliveries([]);
  };

  // ---- Cancel ----
  const handleCancelDelivery = (delivery: Delivery) => {
    Alert.alert(
      'Cancelar Entrega',
      `Deseja realmente cancelar a entrega #${delivery.id}?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(delivery.id);
            const result = await deliveryService.cancelDelivery(
              delivery.id.toString(),
              'Cancelado pelo cliente'
            );
            setCancellingId(null);
            if (result.success) {
              Alert.alert('Sucesso', 'Entrega cancelada com sucesso!');
              handleRefresh();
            } else {
              Alert.alert('Erro', result.error || 'Erro ao cancelar entrega');
            }
          },
        },
      ]
    );
  };

  // ---- Detail Modal ----
  const openDetailModal = async (delivery: Delivery) => {
    setDetailDelivery(delivery);
    setRouteCoords([]);
    setDetailModalVisible(true);

    // Load route for mini-map
    if (delivery.fromLatitude && delivery.fromLongitude && delivery.toLatitude && delivery.toLongitude) {
      setLoadingRoute(true);
      try {
        const route = await freightService.getRouteDistance(
          delivery.fromLatitude,
          delivery.fromLongitude,
          delivery.toLatitude,
          delivery.toLongitude
        );
        if (route && route.encodedPolyline) {
          const coords = freightService.decodePolyline(route.encodedPolyline);
          setRouteCoords(coords);
          // Fit map after a brief delay
          setTimeout(() => {
            if (detailMapRef.current && coords.length >= 2) {
              detailMapRef.current.fitToCoordinates(coords, {
                edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                animated: true,
              });
            }
          }, 400);
        }
      } catch (err) {
        console.warn('Erro ao carregar rota:', err);
      } finally {
        setLoadingRoute(false);
      }
    }
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setDetailDelivery(null);
    setRouteCoords([]);
  };

  // ---- Helpers ----
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} às ${hours}:${minutes}`;
  };

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  };

  const shortenAddress = (addr: string): string => {
    if (!addr) return '—';
    // Pega até a primeira vírgula ou os primeiros 40 chars
    const parts = addr.split(',');
    const short = parts[0].trim();
    return short.length > 45 ? short.substring(0, 42) + '...' : short;
  };

  // ---- Timeline ----
  const getTimelineSteps = (delivery: Delivery) => {
    const steps = [
      { label: 'Criada', date: delivery.createdAt, done: true },
      { label: 'Aceita', date: delivery.acceptedAt, done: !!delivery.acceptedAt },
      { label: 'Coletada', date: delivery.pickedUpAt, done: !!delivery.pickedUpAt },
      { label: 'Em Trânsito', date: delivery.inTransitAt, done: !!delivery.inTransitAt },
      { label: 'Entregue', date: delivery.completedAt, done: !!delivery.completedAt },
    ];
    if (delivery.cancelledAt) {
      steps.push({ label: 'Cancelada', date: delivery.cancelledAt, done: true });
    }
    return steps;
  };

  // ---- Render Card ----
  const renderDeliveryCard = ({ item }: { item: Delivery }) => {
    const statusCfg = getStatusConfig(item.status);
    const timeline = getTimelineSteps(item);
    const isActive = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(item.status);

    return (
      <View style={[styles.card, isActive && styles.cardActive]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardId}>#{item.id}</Text>
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bgColor }]}>
            <Ionicons name={statusCfg.icon as any} size={14} color={statusCfg.color} />
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Rota */}
        <View style={styles.routeSection}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.routeText} numberOfLines={1}>{shortenAddress(item.fromAddress)}</Text>
          </View>
          <View style={styles.routeConnector} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.routeText} numberOfLines={1}>{shortenAddress(item.toAddress)}</Text>
          </View>
        </View>

        {/* Info Row */}
        <View style={styles.infoGrid}>
          {item.distanceKm > 0 && (
            <View style={styles.infoChip}>
              <Ionicons name="map-outline" size={13} color="#94a3b8" />
              <Text style={styles.infoChipText}>{item.distanceKm.toFixed(1)} km</Text>
            </View>
          )}
          {item.shippingFee > 0 && (
            <View style={styles.infoChip}>
              <Ionicons name="bicycle-outline" size={13} color="#94a3b8" />
              <Text style={styles.infoChipText}>Frete: {formatCurrency(item.shippingFee)}</Text>
            </View>
          )}
          {item.totalAmount > 0 && (
            <View style={styles.infoChip}>
              <Ionicons name="cash-outline" size={13} color="#f59e0b" />
              <Text style={[styles.infoChipText, { color: '#f59e0b' }]}>Cobrar: {formatCurrency(item.totalAmount)}</Text>
            </View>
          )}
        </View>

        {/* Destinatário */}
        {item.recipientName && (
          <View style={styles.recipientRow}>
            <Ionicons name="person-outline" size={14} color="#64748b" />
            <Text style={styles.recipientText}>
              {item.recipientName}
              {item.recipientPhone ? ` • ${item.recipientPhone}` : ''}
            </Text>
          </View>
        )}

        {/* Motoboy (se aceito) */}
        {item.courier && (
          <View style={styles.courierRow}>
            <Ionicons name="bicycle" size={14} color="#3b82f6" />
            <Text style={styles.courierText}>
              Motoboy: <Text style={{ fontWeight: 'bold' }}>{item.courier.name}</Text>
              {item.courier.phone ? ` • ${item.courier.phone}` : ''}
            </Text>
          </View>
        )}

        {/* Mini Timeline */}
        <View style={styles.timeline}>
          {timeline.map((step, idx) => (
            <View key={idx} style={styles.timelineStep}>
              <View style={[
                styles.timelineDot,
                step.done ? styles.timelineDotDone : styles.timelineDotPending,
                step.label === 'Cancelada' && styles.timelineDotCancelled,
              ]} />
              {idx < timeline.length - 1 && (
                <View style={[
                  styles.timelineLine,
                  step.done ? styles.timelineLineDone : styles.timelineLinePending,
                ]} />
              )}
              <Text style={[
                styles.timelineLabel,
                step.done ? styles.timelineLabelDone : styles.timelineLabelPending,
                step.label === 'Cancelada' && { color: '#ef4444' },
              ]}>{step.label}</Text>
            </View>
          ))}
        </View>

        {/* Cancelamento */}
        {item.status === 'CANCELLED' && item.cancellationReason && (
          <View style={styles.cancelReasonBox}>
            <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
            <Text style={styles.cancelReasonText}>{item.cancellationReason}</Text>
          </View>
        )}

        {/* Ações */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => openDetailModal(item)}
          >
            <Ionicons name="eye-outline" size={16} color="#93c5fd" />
            <Text style={styles.detailButtonText}>Detalhes</Text>
          </TouchableOpacity>

          {item.status === 'PENDING' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelDelivery(item)}
              disabled={cancellingId === item.id}
            >
              {cancellingId === item.id ? (
                <ActivityIndicator size="small" color="#fca5a5" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={16} color="#fca5a5" />
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ---- Empty State ----
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={64} color="#334155" />
        <Text style={styles.emptyTitle}>Nenhuma entrega encontrada</Text>
        <Text style={styles.emptySubtitle}>
          {`Nenhuma entrega com status "${FILTER_TABS.find(t => t.key === activeFilter)?.label}".`}
        </Text>
      </View>
    );
  };

  // ---- Footer Loader ----
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#10b981" />
        <Text style={styles.footerText}>Carregando mais...</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📦 Minhas Entregas</Text>
          {!loading && (
            <Text style={styles.headerCount}>{totalElements} entrega{totalElements !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                activeFilter === tab.key && styles.filterTabActive,
              ]}
              onPress={() => handleFilterChange(tab.key)}
            >
              <Text style={[
                styles.filterTabText,
                activeFilter === tab.key && styles.filterTabTextActive,
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Carregando entregas...</Text>
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={item => item.id.toString()}
          renderItem={renderDeliveryCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#10b981"
              colors={['#10b981']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* ====== MODAL DE DETALHES ====== */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeDetailModal} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Entrega #{detailDelivery?.id}
              </Text>
              {detailDelivery && (
                <View style={[styles.statusBadge, { backgroundColor: getStatusConfig(detailDelivery.status).bgColor }]}>
                  <Ionicons name={getStatusConfig(detailDelivery.status).icon as any} size={13} color={getStatusConfig(detailDelivery.status).color} />
                  <Text style={[styles.statusText, { color: getStatusConfig(detailDelivery.status).color }]}>
                    {getStatusConfig(detailDelivery.status).label}
                  </Text>
                </View>
              )}
            </View>

            {detailDelivery && (
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {/* Mini-Mapa */}
                {detailDelivery.fromLatitude && detailDelivery.toLatitude && (
                  <View style={styles.detailMapCard}>
                    <View style={styles.detailMapWrapper}>
                      <MapView
                        ref={detailMapRef}
                        style={styles.detailMap}
                        provider={PROVIDER_GOOGLE}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                        toolbarEnabled={false}
                        mapType="standard"
                        initialRegion={{
                          latitude: (detailDelivery.fromLatitude! + detailDelivery.toLatitude!) / 2,
                          longitude: (detailDelivery.fromLongitude! + detailDelivery.toLongitude!) / 2,
                          latitudeDelta: 0.05,
                          longitudeDelta: 0.05,
                        }}
                        onMapReady={() => {
                          if (routeCoords.length >= 2) {
                            setTimeout(() => {
                              detailMapRef.current?.fitToCoordinates(routeCoords, {
                                edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                                animated: false,
                              });
                            }, 200);
                          } else {
                            // Fit to origin + destination
                            setTimeout(() => {
                              detailMapRef.current?.fitToCoordinates(
                                [
                                  { latitude: detailDelivery.fromLatitude!, longitude: detailDelivery.fromLongitude! },
                                  { latitude: detailDelivery.toLatitude!, longitude: detailDelivery.toLongitude! },
                                ],
                                { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false }
                              );
                            }, 200);
                          }
                        }}
                      >
                        {/* Rota */}
                        {routeCoords.length >= 2 && (
                          <Polyline
                            coordinates={routeCoords}
                            strokeColor="#10b981"
                            strokeWidth={4}
                          />
                        )}
                        {/* Origem */}
                        <Marker
                          coordinate={{ latitude: detailDelivery.fromLatitude!, longitude: detailDelivery.fromLongitude! }}
                          anchor={{ x: 0.5, y: 0.5 }}
                          tracksViewChanges={false}
                        >
                          <View style={[styles.mapPin, { backgroundColor: '#10b981' }]}>
                            <Ionicons name="location" size={14} color="#fff" />
                          </View>
                        </Marker>
                        {/* Destino */}
                        <Marker
                          coordinate={{ latitude: detailDelivery.toLatitude!, longitude: detailDelivery.toLongitude! }}
                          anchor={{ x: 0.5, y: 0.5 }}
                          tracksViewChanges={false}
                        >
                          <View style={[styles.mapPin, { backgroundColor: '#ef4444' }]}>
                            <Ionicons name="flag" size={14} color="#fff" />
                          </View>
                        </Marker>
                      </MapView>
                      {loadingRoute && (
                        <View style={styles.mapLoadingOverlay}>
                          <ActivityIndicator size="small" color="#10b981" />
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Rota (endereços) */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Percurso</Text>
                  <View style={styles.detailRouteBlock}>
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDot, { backgroundColor: '#10b981' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailRouteLabel}>Origem</Text>
                        <Text style={styles.detailRouteAddr}>{detailDelivery.fromAddress}</Text>
                        {detailDelivery.fromCity && (
                          <Text style={styles.detailRouteCity}>{detailDelivery.fromCity}</Text>
                        )}
                      </View>
                    </View>
                    <View style={[styles.routeConnector, { marginLeft: 4, height: 20 }]} />
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailRouteLabel}>Destino</Text>
                        <Text style={styles.detailRouteAddr}>{detailDelivery.toAddress}</Text>
                        {detailDelivery.toCity && (
                          <Text style={styles.detailRouteCity}>{detailDelivery.toCity}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Info da Entrega */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Informações</Text>
                  <View style={styles.detailGrid}>
                    {detailDelivery.distanceKm > 0 && (
                      <View style={styles.detailInfoItem}>
                        <Ionicons name="map-outline" size={16} color="#94a3b8" />
                        <Text style={styles.detailInfoLabel}>Distância</Text>
                        <Text style={styles.detailInfoValue}>{detailDelivery.distanceKm.toFixed(1)} km</Text>
                      </View>
                    )}
                    {detailDelivery.shippingFee > 0 && (
                      <View style={styles.detailInfoItem}>
                        <Ionicons name="bicycle-outline" size={16} color="#94a3b8" />
                        <Text style={styles.detailInfoLabel}>Frete</Text>
                        <Text style={styles.detailInfoValue}>{formatCurrency(detailDelivery.shippingFee)}</Text>
                      </View>
                    )}
                    {detailDelivery.totalAmount > 0 && (
                      <View style={styles.detailInfoItem}>
                        <Ionicons name="cash-outline" size={16} color="#f59e0b" />
                        <Text style={styles.detailInfoLabel}>Cobrar na entrega</Text>
                        <Text style={[styles.detailInfoValue, { color: '#f59e0b' }]}>{formatCurrency(detailDelivery.totalAmount)}</Text>
                      </View>
                    )}
                    <View style={styles.detailInfoItem}>
                      <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                      <Text style={styles.detailInfoLabel}>Criada em</Text>
                      <Text style={styles.detailInfoValue}>{formatDate(detailDelivery.createdAt)}</Text>
                    </View>
                  </View>
                </View>

                {/* Item */}
                {detailDelivery.itemDescription && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Item</Text>
                    <Text style={styles.detailItemText}>{detailDelivery.itemDescription}</Text>
                  </View>
                )}

                {/* Destinatário */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Destinatário</Text>
                  <View style={styles.detailPersonRow}>
                    <Ionicons name="person-outline" size={18} color="#94a3b8" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailPersonName}>{detailDelivery.recipientName}</Text>
                      {detailDelivery.recipientPhone && (
                        <Text style={styles.detailPersonPhone}>{detailDelivery.recipientPhone}</Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Motoboy */}
                {detailDelivery.courier && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Motoboy</Text>
                    <View style={[styles.detailPersonRow, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                      <Ionicons name="bicycle" size={18} color="#3b82f6" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.detailPersonName, { color: '#93c5fd' }]}>{detailDelivery.courier.name}</Text>
                        {detailDelivery.courier.phone && (
                          <Text style={[styles.detailPersonPhone, { color: '#60a5fa' }]}>{detailDelivery.courier.phone}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}

                {/* Timeline completa */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Timeline</Text>
                  <View style={styles.detailTimeline}>
                    {getTimelineSteps(detailDelivery).map((step, idx, arr) => (
                      <View key={idx} style={styles.detailTimelineRow}>
                        <View style={styles.detailTimelineLeft}>
                          <View style={[
                            styles.detailTimelineDot,
                            step.done ? styles.timelineDotDone : styles.timelineDotPending,
                            step.label === 'Cancelada' && styles.timelineDotCancelled,
                          ]} />
                          {idx < arr.length - 1 && (
                            <View style={[
                              styles.detailTimelineVLine,
                              step.done ? styles.timelineLineDone : styles.timelineLinePending,
                            ]} />
                          )}
                        </View>
                        <View style={styles.detailTimelineContent}>
                          <Text style={[
                            styles.detailTimelineLabel,
                            step.done && { color: step.label === 'Cancelada' ? '#ef4444' : '#10b981', fontWeight: '600' },
                          ]}>{step.label}</Text>
                          {step.date && (
                            <Text style={styles.detailTimelineDate}>{formatDate(step.date)}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Cancelamento razão */}
                {detailDelivery.status === 'CANCELLED' && detailDelivery.cancellationReason && (
                  <View style={[styles.cancelReasonBox, { marginHorizontal: 0, marginBottom: 16 }]}>
                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                    <Text style={styles.cancelReasonText}>{detailDelivery.cancellationReason}</Text>
                  </View>
                )}

                {/* Cancelar do modal se PENDING */}
                {detailDelivery.status === 'PENDING' && (
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => {
                      closeDetailModal();
                      setTimeout(() => handleCancelDelivery(detailDelivery), 300);
                    }}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                    <Text style={styles.modalCancelBtnText}>Cancelar esta Entrega</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// ESTILOS
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerCount: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },

  // ---- Filters ----
  filterContainer: {
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#334155',
  },
  filterTabActive: {
    backgroundColor: '#10b981',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterTabTextActive: {
    color: '#fff',
  },

  // ---- Loading ----
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
  },

  // ---- List ----
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // ---- Card ----
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardActive: {
    borderColor: '#10b981',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    gap: 2,
  },
  cardId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  cardDate: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ---- Route ----
  routeSection: {
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeConnector: {
    width: 2,
    height: 14,
    backgroundColor: '#334155',
    marginLeft: 4,
    marginVertical: 2,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
  },

  // ---- Info Grid ----
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  infoChipText: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // ---- Recipient ----
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  recipientText: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },

  // ---- Courier ----
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  courierText: {
    fontSize: 12,
    color: '#93c5fd',
    flex: 1,
  },

  // ---- Timeline ----
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  timelineDotDone: {
    backgroundColor: '#10b981',
  },
  timelineDotPending: {
    backgroundColor: '#334155',
  },
  timelineDotCancelled: {
    backgroundColor: '#ef4444',
  },
  timelineLine: {
    position: 'absolute',
    top: 4,
    left: '55%',
    right: '-45%',
    height: 2,
  },
  timelineLineDone: {
    backgroundColor: '#10b981',
  },
  timelineLinePending: {
    backgroundColor: '#334155',
  },
  timelineLabel: {
    fontSize: 9,
    textAlign: 'center',
  },
  timelineLabelDone: {
    color: '#10b981',
    fontWeight: '600',
  },
  timelineLabelPending: {
    color: '#475569',
  },

  // ---- Cancel Reason ----
  cancelReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelReasonText: {
    flex: 1,
    fontSize: 12,
    color: '#fca5a5',
    lineHeight: 16,
  },

  // ---- Empty ----
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ---- Card Actions ----
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  detailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  detailButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#93c5fd',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fca5a5',
  },

  // ---- Modal ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ---- Detail Map ----
  detailMapCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailMapWrapper: {
    height: 200,
    position: 'relative',
  },
  detailMap: {
    flex: 1,
  },
  mapPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Detail Sections ----
  detailSection: {
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailRouteBlock: {
    gap: 0,
  },
  detailRouteLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  detailRouteAddr: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 18,
  },
  detailRouteCity: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  detailGrid: {
    gap: 10,
  },
  detailInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailInfoLabel: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
  },
  detailInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  detailItemText: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  detailPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 10,
  },
  detailPersonName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  detailPersonPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // ---- Detail Timeline ----
  detailTimeline: {
    gap: 0,
  },
  detailTimelineRow: {
    flexDirection: 'row',
    minHeight: 44,
  },
  detailTimelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  detailTimelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 2,
  },
  detailTimelineVLine: {
    flex: 1,
    width: 2,
    marginTop: 2,
  },
  detailTimelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 12,
  },
  detailTimelineLabel: {
    fontSize: 14,
    color: '#475569',
  },
  detailTimelineDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // ---- Modal Cancel Btn ----
  modalCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // ---- Footer ----
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
  },
});
