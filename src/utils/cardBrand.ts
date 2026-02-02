import { CardBrand } from '../types/payment';

/**
 * Detecta a bandeira do cartão baseado no número
 */
export const detectCardBrand = (number: string): CardBrand => {
  const cleaned = number.replace(/\s/g, '');

  // Visa: começa com 4
  if (/^4/.test(cleaned)) return 'VISA';

  // Mastercard: 51-55 ou 2221-2720
  if (/^5[1-5]/.test(cleaned) || /^2(2[2-9][0-9]|[3-6][0-9]{2}|7[0-1][0-9]|720)/.test(cleaned)) {
    return 'MASTERCARD';
  }

  // Amex: 34 ou 37
  if (/^3[47]/.test(cleaned)) return 'AMEX';

  // Elo
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|6277|6362|6363|6504|6505|6516)/.test(cleaned)) {
    return 'ELO';
  }

  // Hipercard
  if (/^(606282|637095|637568|637599|637609|637612)/.test(cleaned)) {
    return 'HIPERCARD';
  }

  // Diners: 36, 38, 300-305
  if (/^3(0[0-5]|[68])/.test(cleaned)) return 'DINERS';

  // Discover: 6011, 622126-622925, 644-649, 65
  if (/^(6011|65|64[4-9]|622)/.test(cleaned)) return 'DISCOVER';

  // JCB: 3528-3589
  if (/^35(2[89]|[3-8][0-9])/.test(cleaned)) return 'JCB';

  return 'OTHER';
};

/**
 * Retorna o ícone da bandeira
 */
export const getCardBrandIcon = (brand: string): string => {
  const icons: Record<string, string> = {
    VISA: '💳',
    MASTERCARD: '💳',
    AMEX: '💳',
    ELO: '💳',
    HIPERCARD: '💳',
    DINERS: '💳',
    DISCOVER: '💳',
    JCB: '💳',
    OTHER: '💳',
  };
  return icons[brand] || '💳';
};
