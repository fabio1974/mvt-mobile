// Tipos de pagamento (para cobrança automática, sem CASH)
export type PaymentMethodType = 'PIX' | 'CREDIT_CARD';

// Tipo de entrega/viagem
export type DeliveryType = 'DELIVERY' | 'RIDE';

// Bandeiras de cartão
export type CardBrand = 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'DINERS' | 'DISCOVER' | 'JCB' | 'OTHER';

export interface CreditCard {
  id: number;
  lastFourDigits: string;
  brand: string;
  holderName: string;
  expiration: string; // Formato: MM/YY
  isDefault: boolean;
  isActive: boolean;
  isExpired: boolean;
  maskedNumber: string; // Ex: "Visa **** 4242"
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AddCardRequest {
  cardToken: string;
  setAsDefault: boolean;
}

export interface CardFormData {
  number: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  cvv: string;
}

// Preferência de pagamento para cobrança automática
export interface PaymentPreference {
  preferredPaymentType: PaymentMethodType; // Backend retorna "preferredPaymentType"
  defaultCardId: number | null;
  defaultCardBrand: string | null;
  defaultCardLastFour: string | null;
  hasDefaultCard: boolean;
}

// Request para salvar preferência
export interface SavePaymentPreferenceRequest {
  preferredPaymentMethod: PaymentMethodType; // Request usa "preferredPaymentMethod"
  defaultCardId?: number;
}

// Tipos de notificação de pagamento
export type PaymentNotificationType = 
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PIX_REQUIRED'
  | 'PIX_CONFIRMED';

// Informações de pagamento PIX
export interface PixPaymentInfo {
  deliveryId: string;
  qrCode: string; // QR Code em texto
  qrCodeBase64: string; // Imagem do QR Code em base64
  pixKey: string; // Chave PIX
  amount: number; // Valor em centavos
  expiresAt: string; // ISO timestamp
  pixId: string; // ID da transação PIX
}

// Dados da notificação de pagamento
export interface PaymentNotificationData {
  type: PaymentNotificationType;
  deliveryId: string;
  amount?: number; // em centavos
  message: string;
  pixInfo?: PixPaymentInfo; // Presente quando type = PIX_REQUIRED
  errorCode?: string; // Presente quando type = PAYMENT_FAILED
  errorMessage?: string;
}
