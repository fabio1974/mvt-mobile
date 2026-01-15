import { ENV } from '../config/env';

interface LatLng {
  latitude: number;
  longitude: number;
}

interface RouteResult {
  success: boolean;
  coordinates?: LatLng[];
  distance?: string;
  duration?: string;
  error?: string;
}

/**
 * Serviço para buscar rotas usando a API do Google Directions
 */
class RouteService {
  private apiKey = ENV.GOOGLE_MAPS_API_KEY;
  private cache: Map<string, RouteResult> = new Map();

  /**
   * Decodifica a polyline do Google para array de coordenadas
   */
  private decodePolyline(encoded: string): LatLng[] {
    const points: LatLng[] = [];
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

  /**
   * Gera uma chave de cache para a rota
   */
  private getCacheKey(origin: LatLng, destination: LatLng): string {
    return `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}_${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}`;
  }

  /**
   * Busca a rota entre dois pontos usando a API do Google Directions
   * @param origin Ponto de origem
   * @param destination Ponto de destino
   * @param useCache Se deve usar cache (default: true)
   */
  async getRoute(origin: LatLng, destination: LatLng, useCache: boolean = true): Promise<RouteResult> {
    try {
      // Verifica cache
      const cacheKey = this.getCacheKey(origin, destination);
      if (useCache && this.cache.has(cacheKey)) {
        console.log('📍 Rota carregada do cache');
        return this.cache.get(cacheKey)!;
      }

      console.log(`🗺️ Buscando rota de (${origin.latitude}, ${origin.longitude}) para (${destination.latitude}, ${destination.longitude})`);

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('❌ Erro na API de Directions:', data.status, data.error_message);
        return {
          success: false,
          error: data.error_message || `Erro: ${data.status}`
        };
      }

      const route = data.routes[0];
      const leg = route.legs[0];
      
      // Decodifica a polyline
      const coordinates = this.decodePolyline(route.overview_polyline.points);

      const result: RouteResult = {
        success: true,
        coordinates,
        distance: leg.distance.text,
        duration: leg.duration.text,
      };

      // Salva no cache
      this.cache.set(cacheKey, result);
      
      console.log(`✅ Rota encontrada: ${leg.distance.text}, ${leg.duration.text} (${coordinates.length} pontos)`);

      return result;
    } catch (error: any) {
      console.error('❌ Erro ao buscar rota:', error);
      return {
        success: false,
        error: error.message || 'Erro ao buscar rota'
      };
    }
  }

  /**
   * Limpa o cache de rotas
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache de rotas limpo');
  }
}

export const routeService = new RouteService();
