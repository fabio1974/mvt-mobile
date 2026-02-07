import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import { WizardData } from '../CreateDeliveryWizard';
import { freightService } from '../../../services/freightService';

interface StepConfirmationProps {
  wizardData: WizardData;
  onUpdateAmount: (amount: string) => void;
  onRetryFreight: () => void;
}

export default function StepConfirmation({ wizardData, onUpdateAmount, onRetryFreight }: StepConfirmationProps) {
  const isRide = wizardData.deliveryType === 'RIDE';
  const freight = wizardData.freightSimulation;
  const mapRef = useRef<MapView>(null);

  const formatCurrency = (value: number): string => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  // Decodifica o polyline da rota
  const routeCoords = useMemo(() => {
    if (wizardData.routePolyline) {
      return freightService.decodePolyline(wizardData.routePolyline);
    }
    // Fallback: linha reta entre origem e destino
    if (wizardData.fromLatitude && wizardData.fromLongitude && wizardData.toLatitude && wizardData.toLongitude) {
      return [
        { latitude: wizardData.fromLatitude, longitude: wizardData.fromLongitude },
        { latitude: wizardData.toLatitude, longitude: wizardData.toLongitude },
      ];
    }
    return [];
  }, [wizardData.routePolyline, wizardData.fromLatitude, wizardData.fromLongitude, wizardData.toLatitude, wizardData.toLongitude]);

  // Calcula pontos intermediários para setas de direção
  const arrowMarkers = useMemo(() => {
    if (routeCoords.length < 4) return [];
    
    const markers: Array<{ latitude: number; longitude: number; rotation: number }> = [];
    const totalPoints = routeCoords.length;
    
    // Coloca setas em ~20%, ~50% e ~80% do percurso
    const arrowPositions = [
      Math.floor(totalPoints * 0.2),
      Math.floor(totalPoints * 0.5),
      Math.floor(totalPoints * 0.8),
    ];
    
    for (const idx of arrowPositions) {
      if (idx > 0 && idx < totalPoints - 1) {
        const prev = routeCoords[idx - 1];
        const curr = routeCoords[idx];
        // Calcula ângulo entre dois pontos
        const dLng = curr.longitude - prev.longitude;
        const dLat = curr.latitude - prev.latitude;
        const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
        markers.push({
          latitude: curr.latitude,
          longitude: curr.longitude,
          rotation: angle,
        });
      }
    }
    
    return markers;
  }, [routeCoords]);

  // Ajusta o mapa para mostrar a rota inteira
  useEffect(() => {
    if (mapRef.current && routeCoords.length >= 2) {
      const timer = setTimeout(() => {
        mapRef.current?.fitToCoordinates(routeCoords, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [routeCoords]);

  const hasMapData = wizardData.fromLatitude && wizardData.fromLongitude &&
    wizardData.toLatitude && wizardData.toLongitude;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>✅ Confirmar Solicitação</Text>
      <Text style={styles.subtitle}>Revise os dados antes de finalizar</Text>

      {/* Mini-mapa com rota */}
      {hasMapData && (
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <Ionicons name="navigate-outline" size={18} color="#10b981" />
            <Text style={styles.mapTitle}>Percurso</Text>
            {wizardData.distanceKm && (
              <Text style={styles.mapDistance}>{wizardData.distanceKm.toFixed(1)} km</Text>
            )}
          </View>
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
              mapType="standard"
              initialRegion={{
                latitude: (wizardData.fromLatitude! + wizardData.toLatitude!) / 2,
                longitude: (wizardData.fromLongitude! + wizardData.toLongitude!) / 2,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {/* Linha da rota */}
              {routeCoords.length >= 2 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="#10b981"
                  strokeWidth={4}
                  lineDashPattern={undefined}
                />
              )}

              {/* Setas de direção ao longo da rota */}
              {arrowMarkers.map((arrow, index) => (
                <Marker
                  key={`arrow-${index}`}
                  coordinate={{ latitude: arrow.latitude, longitude: arrow.longitude }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  flat
                  tracksViewChanges={false}
                  rotation={arrow.rotation}
                >
                  <View style={styles.arrowContainer}>
                    <Ionicons name="chevron-up" size={18} color="#10b981" />
                  </View>
                </Marker>
              ))}

              {/* Marcador de origem */}
              <Marker
                coordinate={{
                  latitude: wizardData.fromLatitude!,
                  longitude: wizardData.fromLongitude!,
                }}
                anchor={{ x: 0.5, y: 0.9 }}
                tracksViewChanges={false}
              >
                <View style={styles.originMarker}>
                  <Ionicons name="location" size={28} color="#10b981" />
                </View>
              </Marker>

              {/* Marcador de destino */}
              <Marker
                coordinate={{
                  latitude: wizardData.toLatitude!,
                  longitude: wizardData.toLongitude!,
                }}
                anchor={{ x: 0.5, y: 0.9 }}
                tracksViewChanges={false}
              >
                <View style={styles.destinationMarker}>
                  <Ionicons name="location" size={28} color="#ef4444" />
                </View>
              </Marker>
            </MapView>

            {/* Legenda do mapa */}
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}>
                <Ionicons name="location" size={14} color="#10b981" />
                <Text style={styles.legendText}>Origem</Text>
              </View>
              <View style={styles.legendItem}>
                <Ionicons name="location" size={14} color="#ef4444" />
                <Text style={styles.legendText}>Destino</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Card de resumo */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.typeBadge}>
            <Ionicons
              name={isRide ? 'car' : 'cube'}
              size={20}
              color="#fff"
            />
            <Text style={styles.typeBadgeText}>
              {isRide ? '🚗 Viagem' : '📦 Entrega'}
            </Text>
          </View>
        </View>

        {/* Origem → Destino */}
        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <View style={styles.routeDotOrigin} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Origem</Text>
              <Text style={styles.routeAddress}>{wizardData.fromAddress}</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routePoint}>
            <View style={styles.routeDotDestination} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Destino</Text>
              <Text style={styles.routeAddress}>{wizardData.toAddress}</Text>
            </View>
          </View>
        </View>

        {/* Distância */}
        {wizardData.distanceKm && (
          <View style={styles.infoRow}>
            <Ionicons name="map-outline" size={18} color="#94a3b8" />
            <Text style={styles.infoText}>
              Distância: <Text style={styles.infoValue}>{wizardData.distanceKm.toFixed(2)} km</Text>
            </Text>
          </View>
        )}

        {/* Detalhes específicos de DELIVERY */}
        {!isRide && (
          <>
            <View style={styles.divider} />
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Detalhes da Entrega:</Text>
              <View style={styles.detailRow}>
                <Ionicons name="cube-outline" size={16} color="#94a3b8" />
                <Text style={styles.detailText}>{wizardData.itemDescription}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color="#94a3b8" />
                <Text style={styles.detailText}>Para: {wizardData.recipientName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="call-outline" size={16} color="#94a3b8" />
                <Text style={styles.detailText}>{wizardData.recipientPhone}</Text>
              </View>
              {wizardData.itemValue && wizardData.itemValue.trim() !== '' && (
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={16} color="#f59e0b" />
                  <Text style={styles.detailText}>
                    Cobrar na entrega: <Text style={{ fontWeight: 'bold', color: '#f59e0b' }}>R$ {wizardData.itemValue}</Text>
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Seção de Frete */}
      {wizardData.freightLoading && (
        <View style={styles.freightLoadingCard}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.freightLoadingText}>Calculando frete...</Text>
          <Text style={styles.freightLoadingSubtext}>Consultando rota e preços</Text>
        </View>
      )}

      {wizardData.freightError && !wizardData.freightLoading && (
        <View style={styles.freightErrorCard}>
          <Ionicons name="warning-outline" size={28} color="#f59e0b" />
          <Text style={styles.freightErrorText}>{wizardData.freightError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetryFreight}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {freight && !wizardData.freightLoading && (
        <View style={styles.freightCard}>
          <View style={styles.freightHeader}>
            <Ionicons name="calculator-outline" size={22} color="#10b981" />
            <Text style={styles.freightTitle}>Detalhes do Frete</Text>
          </View>

          <View style={styles.freightBreakdown}>
            {/* Taxa base */}
            <View style={styles.freightRow}>
              <Text style={styles.freightLabel}>Taxa base</Text>
              <Text style={styles.freightValue}>{formatCurrency(freight.baseFee)}</Text>
            </View>

            {/* Distância x Preço/km */}
            <View style={styles.freightRow}>
              <Text style={styles.freightLabel}>
                Distância ({freight.distanceKm.toFixed(2)} km × {formatCurrency(freight.pricePerKm)}/km)
              </Text>
              <Text style={styles.freightValue}>
                {formatCurrency(freight.distanceKm * freight.pricePerKm)}
              </Text>
            </View>

            {/* Mínimo aplicado */}
            {freight.minimumApplied && (
              <View style={styles.freightRow}>
                <View style={styles.freightLabelWithIcon}>
                  <Ionicons name="information-circle-outline" size={14} color="#f59e0b" />
                  <Text style={[styles.freightLabel, { color: '#f59e0b' }]}>
                    Valor mínimo aplicado
                  </Text>
                </View>
                <Text style={[styles.freightValue, { color: '#f59e0b' }]}>
                  {formatCurrency(freight.minimumFee)}
                </Text>
              </View>
            )}

            {/* Subtotal antes da zona */}
            <View style={styles.freightDivider} />
            <View style={styles.freightRow}>
              <Text style={styles.freightLabelSubtotal}>Subtotal</Text>
              <Text style={styles.freightValueSubtotal}>
                {formatCurrency(freight.feeBeforeZone)}
              </Text>
            </View>

            {/* Zona especial */}
            {freight.zoneName && (
              <>
                <View style={styles.freightDivider} />
                <View style={[
                  styles.zoneTag,
                  freight.zoneType === 'DANGER' ? styles.zoneDanger : styles.zoneHighIncome,
                ]}>
                  <Ionicons
                    name={freight.zoneType === 'DANGER' ? 'alert-circle' : 'diamond'}
                    size={16}
                    color={freight.zoneType === 'DANGER' ? '#ef4444' : '#a855f6'}
                  />
                  <Text style={[
                    styles.zoneTagText,
                    freight.zoneType === 'DANGER' ? styles.zoneTextDanger : styles.zoneTextHighIncome,
                  ]}>
                    Zona: {freight.zoneName}
                  </Text>
                </View>
                <View style={styles.freightRow}>
                  <Text style={styles.freightLabel}>
                    Acréscimo de zona (+{(freight.zoneFeePercentage * 100).toFixed(0)}%)
                  </Text>
                  <Text style={[
                    styles.freightValue,
                    { color: freight.zoneType === 'DANGER' ? '#ef4444' : '#a855f6' },
                  ]}>
                    +{formatCurrency(freight.zoneSurcharge)}
                  </Text>
                </View>
              </>
            )}

            {/* Total */}
            <View style={styles.freightDivider} />
            <View style={styles.freightTotalRow}>
              <Text style={styles.freightTotalLabel}>Total do Frete</Text>
              <Text style={styles.freightTotalValue}>
                {formatCurrency(freight.totalShippingFee)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Aviso de pagamento */}
      <View style={[styles.warningBox, isRide && styles.warningBoxRide]}>
        <Ionicons
          name="card-outline"
          size={24}
          color={isRide ? '#8b5cf6' : '#3b82f6'}
        />
        <View style={styles.warningContent}>
          <Text style={[styles.warningTitle, isRide && styles.warningTitleRide]}>
            {isRide ? '💳 Pagamento no Início' : '💰 Pagamento Automático'}
          </Text>
          <Text style={[styles.warningText, isRide && styles.warningTextRide]}>
            {isRide
              ? 'Você será cobrado automaticamente quando o motorista INICIAR a viagem (após aceitar e coletar).'
              : 'Você será cobrado automaticamente quando o motoboy ACEITAR a entrega.'}
          </Text>
          <Text style={[styles.warningText, isRide && styles.warningTextRide]}>
            O pagamento será feito usando sua preferência configurada (PIX ou Cartão).
          </Text>
        </View>
      </View>

      {/* Termos */}
      <View style={styles.termsBox}>
        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
        <Text style={styles.termsText}>
          Ao confirmar, você concorda com nossos termos de serviço e política de pagamento automático.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 20,
  },

  // ========== Mini-mapa ==========
  mapCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    paddingBottom: 0,
  },
  mapTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e2e8f0',
    flex: 1,
  },
  mapDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mapContainer: {
    margin: 14,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  arrowContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originMarker: {
    alignItems: 'center',
  },
  destinationMarker: {
    alignItems: 'center',
  },

  summaryCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryHeader: {
    marginBottom: 20,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  routeContainer: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    gap: 12,
  },
  routeDotOrigin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    marginTop: 4,
  },
  routeDotDestination: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#334155',
    marginLeft: 5,
    marginVertical: 4,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  infoValue: {
    fontWeight: 'bold',
    color: '#10b981',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  detailsSection: {
    gap: 10,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },

  // ========== Frete Loading ==========
  freightLoadingCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 30,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    gap: 12,
  },
  freightLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  freightLoadingSubtext: {
    fontSize: 13,
    color: '#64748b',
  },

  // ========== Frete Error ==========
  freightErrorCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
    alignItems: 'center',
    gap: 12,
  },
  freightErrorText: {
    fontSize: 14,
    color: '#fbbf24',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // ========== Frete Card ==========
  freightCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  freightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  freightTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#10b981',
  },
  freightBreakdown: {
    gap: 10,
  },
  freightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  freightLabel: {
    fontSize: 13,
    color: '#94a3b8',
    flex: 1,
  },
  freightLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  freightValue: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  freightLabelSubtotal: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  freightValueSubtotal: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  freightDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 6,
  },
  freightTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  freightTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  freightTotalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#10b981',
  },

  // ========== Zona Especial ==========
  zoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  zoneDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  zoneHighIncome: {
    backgroundColor: 'rgba(168, 85, 246, 0.15)',
  },
  zoneTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  zoneTextDanger: {
    color: '#ef4444',
  },
  zoneTextHighIncome: {
    color: '#a855f6',
  },

  // ========== Warning & Terms ==========
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  warningBoxRide: {
    backgroundColor: '#2e1065',
    borderColor: '#8b5cf6',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#bfdbfe',
    marginBottom: 6,
  },
  warningTitleRide: {
    color: '#ddd6fe',
  },
  warningText: {
    fontSize: 13,
    color: '#93c5fd',
    lineHeight: 18,
    marginBottom: 4,
  },
  warningTextRide: {
    color: '#c4b5fd',
  },
  termsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
});
