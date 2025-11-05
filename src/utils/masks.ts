/**
 * Utilitários para máscaras de entrada
 * Adaptado do projeto web para React Native
 */

// ==================== MÁSCARAS ====================

/**
 * Máscara para CPF: 000.000.000-00
 */
export const maskCPF = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

/**
 * Máscara para CNPJ: 00.000.000/0000-00
 */
export const maskCNPJ = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

/**
 * Máscara para CPF ou CNPJ (detecta automaticamente)
 */
export const maskCPForCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.length <= 11 ? maskCPF(value) : maskCNPJ(value);
};

/**
 * Máscara para telefone celular: (00) 00000-0000
 */
export const maskPhoneCellular = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

/**
 * Máscara para telefone fixo: (00) 0000-0000
 */
export const maskPhoneLandline = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

/**
 * Máscara para telefone (celular ou fixo, detecta automaticamente)
 */
export const maskPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  // Se tem 11 dígitos, é celular (9xxxx-xxxx)
  // Se tem 10 dígitos, é fixo (xxxx-xxxx)
  return cleaned.length === 11 ? maskPhoneCellular(value) : maskPhoneLandline(value);
};

/**
 * Máscara para CEP: 00000-000
 */
export const maskCEP = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

/**
 * Máscara para data: dd/MM/yyyy
 */
export const maskDate = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\/\d{4})\d+?$/, '$1');
};

/**
 * Máscara para hora: HH:mm
 */
export const maskTime = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1:$2')
    .replace(/(:\d{2})\d+?$/, '$1');
};

/**
 * Máscara para moeda (BRL): R$ 0.000,00
 */
export const maskCurrency = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const number = parseInt(cleaned) / 100;
  
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// ==================== UNMASK (REMOVER MÁSCARAS) ====================

/**
 * Remove todos os caracteres não numéricos
 */
export const unmask = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Remove máscara de moeda e retorna número
 */
export const unmaskCurrency = (value: string): number => {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

// ==================== VALIDAÇÕES ====================

/**
 * Valida CPF
 */
export const validateCPF = (cpf: string): boolean => {
  const cleaned = unmask(cpf);
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false; // Todos os dígitos iguais
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
};

/**
 * Valida CNPJ
 */
export const validateCNPJ = (cnpj: string): boolean => {
  const cleaned = unmask(cnpj);
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Validação dos dígitos verificadores
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned.charAt(12))) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned.charAt(13))) return false;
  
  return true;
};

/**
 * Detecta automaticamente tipo de máscara baseado no nome do campo
 */
export const getAutoMask = (fieldName: string): ((value: string) => string) | null => {
  const lowerName = fieldName.toLowerCase();
  
  if (lowerName.includes('cpf')) return maskCPF;
  if (lowerName.includes('cnpj')) return maskCNPJ;
  if (lowerName.includes('telefone') || lowerName.includes('phone') || lowerName.includes('celular')) {
    return maskPhone;
  }
  if (lowerName.includes('cep') || lowerName.includes('zip')) return maskCEP;
  if (lowerName.includes('data') || lowerName.includes('date') || lowerName.includes('nascimento')) {
    return maskDate;
  }
  if (lowerName.includes('hora') || lowerName.includes('time')) return maskTime;
  if (lowerName.includes('valor') || lowerName.includes('preco') || lowerName.includes('price')) {
    return maskCurrency;
  }
  
  return null;
};

/**
 * Remove máscaras de um objeto de dados antes de enviar para o backend
 */
export const unmaskFormData = (data: Record<string, any>): Record<string, any> => {
  const unmasked: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      const lowerKey = key.toLowerCase();
      
      // Remove máscara de CPF, CNPJ, telefone, CEP
      if (
        lowerKey.includes('cpf') ||
        lowerKey.includes('cnpj') ||
        lowerKey.includes('telefone') ||
        lowerKey.includes('phone') ||
        lowerKey.includes('cep')
      ) {
        unmasked[key] = unmask(value);
      }
      // Remove máscara de moeda
      else if (lowerKey.includes('valor') || lowerKey.includes('preco') || lowerKey.includes('price')) {
        unmasked[key] = unmaskCurrency(value);
      }
      // Mantém valor original
      else {
        unmasked[key] = value;
      }
    }
    // Se for objeto aninhado, aplica recursivamente
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      unmasked[key] = unmaskFormData(value);
    }
    // Arrays e outros tipos mantém valor original
    else {
      unmasked[key] = value;
    }
  }
  
  return unmasked;
};
