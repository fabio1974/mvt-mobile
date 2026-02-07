import { apiClient } from './api';
import ENV from '../config/env';

// ============================================
// TIPOS
// ============================================

export interface FreightSimulationRequest {
  fromLatitude: number;
  fromLongitude: number;
  fromAddress?: string;
  toLatitude: number;
  toLongitude: number;
  toAddress?: string;
  distanceKm: number;
}

export interface FreightSimulationResponse {
  distanceKm: number;
  pricePerKm: number;
  baseFee: number;
  minimumFee: number;
  minimumApplied: boolean;
  feeBeforeZone: number;
  zoneName: string | null;
  zoneType: 'DANGER' | 'HIGH_INCOME' | null;
  zoneFeePercentage: number;
  zoneSurcharge: number;
  totalShippingFee: number;
  fromAddress: string | null;
  toAddress: string | null;
}

export interface RouteResult {
  distanceKm: number;
  encodedPolyline: string | null;
  durationText: string | null;
}

// ============================================
// GOOGLE ROUTES API - Distância real por estrada
// ============================================

/**
 * Calcula a distância real por estrada usando a Google Routes API.
 * Retorna a distância em km e o polyline codificado da rota.
 */
async function getRouteDistance(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<RouteResult> {
  try {
    console.log('🛣️ [FreightService] Calculando distância via Google Routes...');
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&key=${ENV.GOOGLE_MAPS_API_KEY}&language=pt-BR`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      const distanceMeters = leg.distance.value;
      const distanceKm = distanceMeters / 1000;
      const encodedPolyline = route.overview_polyline?.points || null;
      
      console.log(`✅ [FreightService] Distância calculada: ${distanceKm.toFixed(2)} km (${leg.distance.text})`);
      console.log(`   Duração estimada: ${leg.duration.text}`);
      
      return { distanceKm, encodedPolyline, durationText: leg.duration.text };
    }
    
    console.warn('⚠️ [FreightService] Google Routes sem resultado, usando distância em linha reta');
    return {
      distanceKm: calculateStraightLineDistance(fromLat, fromLng, toLat, toLng),
      encodedPolyline: null,
      durationText: null,
    };
    
  } catch (error) {
    console.error('❌ [FreightService] Erro ao calcular rota:', error);
    return {
      distanceKm: calculateStraightLineDistance(fromLat, fromLng, toLat, toLng),
      encodedPolyline: null,
      durationText: null,
    };
  }
}

/**
 * Calcula distância em linha reta usando a fórmula de Haversine.
 * Usado como fallback caso a Google Routes API falhe.
 */
function calculateStraightLineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ============================================
// SIMULAÇÃO DE FRETE
// ============================================

/**
 * Simula o frete chamando o backend.
 * 1. Calcula a distância real via Google Routes
 * 2. Envia para POST /api/deliveries/simulate-freight
 */
async function simulateFreight(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  fromAddress?: string,
  toAddress?: string,
): Promise<FreightSimulationResponse & { encodedPolyline: string | null }> {
  // 1. Calcula distância real por estrada
  const routeResult = await getRouteDistance(fromLat, fromLng, toLat, toLng);
  
  console.log(`🚚 [FreightService] Simulando frete para ${routeResult.distanceKm.toFixed(2)} km...`);
  
  // 2. Chama o backend para calcular o preço
  const body: FreightSimulationRequest = {
    fromLatitude: fromLat,
    fromLongitude: fromLng,
    fromAddress: fromAddress || '',
    toLatitude: toLat,
    toLongitude: toLng,
    toAddress: toAddress || '',
    distanceKm: parseFloat(routeResult.distanceKm.toFixed(2)),
  };
  
  const response = await apiClient.post<FreightSimulationResponse>(
    '/deliveries/simulate-freight',
    body,
  );
  
  console.log('✅ [FreightService] Simulação recebida:', {
    distância: `${response.data.distanceKm} km`,
    frete: `R$ ${response.data.totalShippingFee.toFixed(2)}`,
    zona: response.data.zoneName || 'nenhuma',
  });
  
  return {
    ...response.data,
    encodedPolyline: routeResult.encodedPolyline,
  };
}

/**
 * Decodifica um polyline codificado do Google Maps para um array de coordenadas.
 */
function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

// ============================================
// EXPORT
// ============================================

export const freightService = {
  getRouteDistance,
  simulateFreight,
  calculateStraightLineDistance,
  decodePolyline,
};
