import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AddressSelector, { AddressData } from '../AddressSelector';
import { DeliveryType } from '../../../types/payment';
import { InitialCenter } from '../../../services/userAddressService';

interface StepOriginAddressProps {
  address: string;
  latitude: number | null;
  longitude: number | null;
  initialMapCenter?: InitialCenter | null;
  deliveryType?: DeliveryType;
  isConfirmed?: boolean;
  onUpdate: (data: {
    fromAddress: string;
    fromLatitude: number | null;
    fromLongitude: number | null;
    fromAddressConfirmed?: boolean;
  }) => void;
  onConfirmAndAdvance?: () => void;
}

// Fallback para Sobral se não tiver localização
const DEFAULT_CENTER = {
  latitude: -3.6880,
  longitude: -40.3497,
};

export default function StepOriginAddress({
  address,
  latitude,
  longitude,
  initialMapCenter,
  deliveryType = 'DELIVERY',
  isConfirmed = false,
  onUpdate,
  onConfirmAndAdvance,
}: StepOriginAddressProps) {
  
  // Determina o centro inicial do mapa
  const getInitialCenter = () => {
    // Se já tem coordenadas salvas, usa elas
    if (latitude && longitude) {
      return { latitude, longitude };
    }
    // Se tem initialMapCenter do wizard, usa ele
    if (initialMapCenter) {
      return { latitude: initialMapCenter.latitude, longitude: initialMapCenter.longitude };
    }
    // Fallback
    return DEFAULT_CENTER;
  };

  // Mapeia os dados genéricos para os campos específicos do delivery
  const handleUpdate = (data: AddressData) => {
    onUpdate({
      fromAddress: data.address,
      fromLatitude: data.latitude,
      fromLongitude: data.longitude,
      fromAddressConfirmed: data.confirmed,
    });
  };

  // Define o título baseado no tipo de delivery
  const title = deliveryType === 'DELIVERY' 
    ? '📍 Local de coleta do pedido?' 
    : '📍 De onde você sai?';

  // Mostra loading enquanto não tem centro inicial
  if (!initialMapCenter && !latitude && !longitude) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Carregando mapa...</Text>
      </View>
    );
  }

  // Key para forçar remontagem e resetar zoom quando não há origem confirmada
  const selectorKey = (!latitude && !longitude) ? 'new-origin' : 'saved-origin';

  return (
    <AddressSelector
      key={selectorKey}
      title={title}
      confirmModalTitle="📍 Confirmar local"
      address={address}
      latitude={latitude}
      longitude={longitude}
      isConfirmed={isConfirmed}
      initialCenter={getInitialCenter()}
      onUpdate={handleUpdate}
      onConfirmAndAdvance={onConfirmAndAdvance}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
  },
});
