export type PaymentMethodType = 'PIX' | 'CREDIT_CARD' | 'CASH';

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
