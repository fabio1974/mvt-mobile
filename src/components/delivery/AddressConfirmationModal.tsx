import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

interface AddressConfirmationModalProps {
  visible: boolean;
  title: string;
  markerColor: string;
  selectedMarker: { latitude: number; longitude: number } | null;
  currentAddress: string;
  distance?: number | null;
  distanceLabel?: string;
  onConfirm: () => void;
  onAdjust: () => void;
  onClose: () => void;
}

export default function AddressConfirmationModal({
  visible,
  title,
  markerColor,
  selectedMarker,
  currentAddress,
  distance,
  distanceLabel = 'da origem',
  onConfirm,
  onAdjust,
  onClose,
}: AddressConfirmationModalProps) {
  const confirmMapRef = useRef<MapView>(null);

  const handleAdjust = () => {
    Keyboard.dismiss();
    onAdjust();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalContent}>
          <View style={styles.confirmModalHeader}>
            <Text style={styles.confirmModalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Mapa de Confirmação - Satélite com zoom 19 */}
          {selectedMarker && (
            <View style={styles.confirmMapContainer}>
              <MapView
                ref={confirmMapRef}
                style={styles.confirmMap}
                provider={PROVIDER_GOOGLE}
                mapType="hybrid"
                initialRegion={{
                  latitude: selectedMarker.latitude,
                  longitude: selectedMarker.longitude,
                  latitudeDelta: 0.0005,
                  longitudeDelta: 0.0005,
                }}
                onMapReady={() => {
                  // Força zoom 19 após o mapa estar pronto
                  setTimeout(() => {
                    confirmMapRef.current?.animateToRegion({
                      latitude: selectedMarker.latitude,
                      longitude: selectedMarker.longitude,
                      latitudeDelta: 0.0005,
                      longitudeDelta: 0.0005,
                    }, 0);
                  }, 100);
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={false}
                toolbarEnabled={false}
                minZoomLevel={19}
                maxZoomLevel={19}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              />
              {/* Bullet fixo no centro */}
              <View style={styles.centerMarkerOverlay} pointerEvents="none">
                <View style={styles.redBullet} />
              </View>
            </View>
          )}

          {/* Endereço por extenso */}
          {currentAddress ? (
            <View style={styles.confirmAddressContainer}>
              <Ionicons name="location" size={24} color={markerColor} />
              <Text style={styles.confirmAddressText}>{currentAddress}</Text>
            </View>
          ) : null}

          {/* Distância (opcional) */}
          {distance !== null && distance !== undefined && distance > 0 && (
            <View style={styles.confirmDistanceContainer}>
              <Ionicons name="navigate" size={20} color="#10b981" />
              <Text style={styles.confirmDistanceText}>
                Distância: {distance.toFixed(2)} km {distanceLabel}
              </Text>
            </View>
          )}

          {/* Coordenadas */}
          {selectedMarker && (
            <Text style={styles.confirmCoordinates}>
              Lat: {selectedMarker.latitude.toFixed(6)}, Lng: {selectedMarker.longitude.toFixed(6)}
            </Text>
          )}

          {/* Botões */}
          <View style={styles.confirmModalButtons}>
            <TouchableOpacity
              style={styles.confirmModalButtonSecondary}
              onPress={handleAdjust}
            >
              <Ionicons name="arrow-back" size={20} color="#0f172a" />
              <Text style={styles.confirmModalButtonSecondaryText}>Ajustar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmModalButtonPrimary}
              onPress={onConfirm}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmModalButtonPrimaryText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  confirmModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  confirmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  confirmMapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#475569',
    marginBottom: 16,
  },
  confirmMap: {
    width: '100%',
    height: '100%',
  },
  centerMarkerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  redBullet: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  confirmAddressContainer: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  confirmAddressText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
    lineHeight: 22,
  },
  confirmDistanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  confirmDistanceText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  confirmCoordinates: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButtonSecondary: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmModalButtonSecondaryText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmModalButtonPrimary: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmModalButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
