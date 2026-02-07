import React from 'react';
import AddressSelector, { AddressData } from '../AddressSelector';
import { DeliveryType } from '../../../types/payment';
import { InitialCenter } from '../../../services/userAddressService';

interface StepDestinationAddressProps {
  address: string;
  latitude: number | null;
  longitude: number | null;
  initialMapCenter?: InitialCenter | null;
  deliveryType?: DeliveryType;
  isConfirmed?: boolean;
  onUpdate: (data: {
    toAddress: string;
    toLatitude: number | null;
    toLongitude: number | null;
    toAddressConfirmed?: boolean;
  }) => void;
  onConfirmAndAdvance?: () => void;
}

// Fallback para Sobral se não tiver localização
const DEFAULT_CENTER = {
  latitude: -3.6880,
  longitude: -40.3497,
};

export default function StepDestinationAddress({
  address,
  latitude,
  longitude,
  initialMapCenter,
  deliveryType = 'DELIVERY',
  isConfirmed = false,
  onUpdate,
  onConfirmAndAdvance,
}: StepDestinationAddressProps) {
  
  // Determina o centro inicial do mapa
  // Prioridade: coordenadas de destino já salvas > centro inicial do wizard (constante) > fallback
  const getInitialCenter = () => {
    // Se já tem coordenadas de destino salvas, usa elas
    if (latitude && longitude) {
      return { latitude, longitude };
    }
    // Usa o centro inicial do wizard (calculado UMA VEZ no início do fluxo)
    if (initialMapCenter) {
      return { latitude: initialMapCenter.latitude, longitude: initialMapCenter.longitude };
    }
    // Fallback
    return DEFAULT_CENTER;
  };

  // Mapeia os dados genéricos para os campos específicos do delivery
  const handleUpdate = (data: AddressData) => {
    onUpdate({
      toAddress: data.address,
      toLatitude: data.latitude,
      toLongitude: data.longitude,
      toAddressConfirmed: data.confirmed,
    });
  };

  // Define o título baseado no tipo de delivery
  const title = deliveryType === 'DELIVERY' 
    ? '📍 Endereço de Destino?' 
    : '🎯 Para onde vai?';

  // Key para forçar remontagem quando não há destino confirmado
  // Isso garante que o AddressSelector seja remontado com o initialMapCenter
  const selectorKey = (!latitude && !longitude) ? 'new-destination' : 'saved-destination';

  return (
    <AddressSelector
      key={selectorKey}
      title={title}
      confirmModalTitle="🎯 Confirmar destino"
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
