/**
 * Valida número do cartão usando algoritmo de Luhn
 */
export const validateCardNumber = (number: string): boolean => {
  const cleaned = number.replace(/\s/g, '');
  
  if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Valida CVV
 */
export const validateCVV = (cvv: string, brand: string): boolean => {
  const length = brand === 'AMEX' ? 4 : 3;
  return /^\d+$/.test(cvv) && cvv.length === length;
};

/**
 * Valida data de expiração
 */
export const validateExpiration = (month: string, year: string): boolean => {
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  if (monthNum < 1 || monthNum > 12) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Se ano tem 2 dígitos, assume 20xx
  const fullYear = yearNum < 100 ? 2000 + yearNum : yearNum;

  if (fullYear < currentYear) return false;
  if (fullYear === currentYear && monthNum < currentMonth) return false;

  return true;
};

/**
 * Formata número do cartão com espaços
 */
export const formatCardNumber = (text: string): string => {
  const cleaned = text.replace(/\s/g, '');
  const chunks = cleaned.match(/.{1,4}/g) || [];
  return chunks.join(' ');
};
