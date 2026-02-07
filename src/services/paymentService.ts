import { apiClient } from './api';
import { 
  CreditCard, 
  PaymentMethodType, 
  CardBrand, 
  AddCardRequest,
  PaymentPreference,
  SavePaymentPreferenceRequest 
} from '../types/payment';

/**
 * Interface para criação de cartão
 */
export interface CreateCardRequest {
  cardNumber: string;
  cardHolderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

/**
 * Interface para preferência de pagamento
 */
export interface PaymentPreferenceRequest {
  preferredMethod: PaymentMethodType;
  selectedCardId?: string;
}

/**
 * Interface para pagador
 */
export interface Payer {
  id: string;
  name: string;
}

/**
 * Interface para um item de pagamento na lista
 */
export interface PaymentItem {
  id: number;
  providerPaymentId: string;
  payer: Payer;
  pixQrCode: string;
  pixQrCodeUrl: string;
  amount: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  paymentDate: string | null;
  deliveryId: number;
  clientEmail: string;
  expired: boolean;
  statusMessage: string;
}

/**
 * Interface para resposta paginada de pagamentos
 */
export interface PaymentsResponse {
  content: PaymentItem[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/**
 * Interface para split de um recipient
 */
export interface SplitItem {
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  amount: number;
  percentage: number;
  liable: boolean;
}

/**
 * Interface para entrega no relatório
 */
export interface ReportDelivery {
  deliveryId: number;
  shippingFee: number;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  splits: SplitItem[];
}

/**
 * Interface para relatório de pagamento
 */
export interface PaymentReport {
  paymentId: number;
  providerPaymentId: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  pixQrCode: string;
  pixQrCodeUrl: string;
  expiresAt: string | null;
  deliveries: ReportDelivery[];
  consolidatedSplits: SplitItem[];
}

/**
 * Interface de resposta genérica
 */
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class PaymentService {
  /**
   * Busca lista paginada de pagamentos do cliente logado
   * GET /payments?page=0&size=10
   */
  async getPayments(page: number = 0, size: number = 10): Promise<ServiceResponse<PaymentsResponse>> {
    try {
      console.log(`💰 Buscando pagamentos (página ${page}, tamanho ${size})...`);
      
      const response = await apiClient.get<PaymentsResponse>(`/payments?page=${page}&size=${size}`);
      
      console.log('✅ Pagamentos carregados:', response.data?.content?.length || 0);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar pagamentos:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Erro ao buscar pagamentos',
      };
    }
  }

  /**
   * Busca relatório detalhado de um pagamento
   * GET /payments/{id}/report
   */
  async getPaymentReport(paymentId: number): Promise<ServiceResponse<PaymentReport>> {
    try {
      console.log(`📊 Buscando relatório do pagamento #${paymentId}...`);
      
      const response = await apiClient.get<PaymentReport>(`/payments/${paymentId}/report`);
      
      console.log('✅ Relatório carregado:', response.data);
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar relatório:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Erro ao buscar relatório',
      };
    }
  }

  /**
   * Formata valor monetário em BRL
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  /**
   * Formata data para exibição
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Retorna cor do badge baseado no status
   */
  getStatusColor(status: string): { bg: string; text: string } {
    const statusColors: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: '#fef3c7', text: '#d97706' },
      PENDENTE: { bg: '#fef3c7', text: '#d97706' },
      PAID: { bg: '#d1fae5', text: '#059669' },
      PAGO: { bg: '#d1fae5', text: '#059669' },
      COMPLETED: { bg: '#d1fae5', text: '#059669' },
      CANCELLED: { bg: '#fee2e2', text: '#dc2626' },
      CANCELADO: { bg: '#fee2e2', text: '#dc2626' },
      FAILED: { bg: '#fee2e2', text: '#dc2626' },
    };
    
    return statusColors[status.toUpperCase()] || { bg: '#f3f4f6', text: '#6b7280' };
  }

  /**
   * Traduz status para português
   */
  translateStatus(status: string): string {
    const translations: Record<string, string> = {
      PENDING: 'Pendente',
      PAID: 'Pago',
      COMPLETED: 'Concluído',
      CANCELLED: 'Cancelado',
      FAILED: 'Falhou',
    };
    
    return translations[status.toUpperCase()] || status;
  }

  // ==================== MÉTODOS DE CARTÃO DE CRÉDITO ====================

  /**
   * Buscar todos os cartões do usuário
   */
  async getCreditCards(): Promise<CreditCard[]> {
    const response = await apiClient.get('/customer-cards');
    return response.data;
  }

  /**
   * Adicionar novo cartão (já tokenizado)
   */
  async addCreditCard(request: AddCardRequest): Promise<CreditCard> {
    console.log('📤 [BACKEND] Enviando token para backend:', {
      token: request.cardToken,
      setAsDefault: request.setAsDefault,
      timestamp: new Date().toISOString(),
    });
    
    const response = await apiClient.post('/customer-cards', request);
    
    console.log('✅ [BACKEND] Cartão salvo com sucesso:', {
      id: response.data.id,
      maskedNumber: response.data.maskedNumber,
      brand: response.data.brand,
    });
    
    return response.data;
  }

  /**
   * Busca cartão padrão
   */
  async getDefaultCard(): Promise<CreditCard> {
    const response = await apiClient.get('/customer-cards/default');
    return response.data;
  }

  /**
   * Deletar cartão
   */
  async deleteCreditCard(cardId: number): Promise<void> {
    await apiClient.delete(`/customer-cards/${cardId}`);
  }

  /**
   * Definir cartão padrão
   */
  async setDefaultCard(cardId: number): Promise<CreditCard> {
    const response = await apiClient.put(`/customer-cards/${cardId}/set-default`);
    return response.data;
  }

  /**
   * Verifica se tem cartões cadastrados
   */
  async hasCards(): Promise<boolean> {
    const response = await apiClient.get<{ hasCards: boolean }>('/customer-cards/has-cards');
    return response.data.hasCards;
  }

  // ==================== PREFERÊNCIA DE PAGAMENTO ====================

  /**
   * Busca preferência de pagamento do customer
   */
  async getPaymentPreference(): Promise<PaymentPreference> {
    try {
      const response = await apiClient.get<PaymentPreference>(
        '/customers/me/payment-preference'
      );
      console.log('✅ Preferência obtida do backend:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao buscar preferência:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      console.error('❌ Message:', error.message);
      
      // IMPORTANTE: Backend está retornando erro 400!
      // Por isso sempre retorna PIX default, mesmo quando DB tem CREDIT_CARD
      console.warn('⚠️ Usando preferência default (PIX) porque backend retornou erro');
      
      return {
        preferredPaymentType: 'PIX', // Default para PIX quando não tem preferência
        defaultCardId: null,
        defaultCardBrand: null,
        defaultCardLastFour: null,
        hasDefaultCard: false,
      };
    }
  }

  /**
   * Salva preferência de pagamento do customer
   */
  async savePaymentPreference(
    request: SavePaymentPreferenceRequest
  ): Promise<PaymentPreference> {
    try {
      console.log('💾 Salvando preferência de pagamento:', request);
      
      const response = await apiClient.put<PaymentPreference>(
        '/customers/me/payment-preference',
        request
      );
      
      console.log('✅ Preferência salva com sucesso');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao salvar preferência:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
export default PaymentService;
