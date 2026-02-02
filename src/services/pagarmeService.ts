import { CardFormData } from '../types/payment';

// TODO: Mover para variáveis de ambiente
// ⚠️ ATENÇÃO: Use APENAS a chave PÚBLICA (pk_test_xxx) aqui!
// A chave secreta (sk_test_xxx) nunca deve estar no código mobile
const PAGARME_PUBLIC_KEY = 'pk_test_KXLDBZ1i8rUx2JnO'; // ← COLOQUE SUA CHAVE PÚBLICA AQUI
const PAGARME_API_URL = 'https://api.pagar.me/core/v5';

/**
 * Tokeniza um cartão de crédito no Pagar.me
 * Este método envia os dados sensíveis DIRETAMENTE para o Pagar.me,
 * nunca passando pelo nosso backend
 */
export const tokenizeCard = async (cardData: CardFormData): Promise<string> => {
  try {
    console.log('🔵 Tokenizando cartão no Pagar.me...');
    
    const response = await fetch(
      `${PAGARME_API_URL}/tokens?appId=${PAGARME_PUBLIC_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'card',
          card: {
            number: cardData.number.replace(/\s/g, ''),
            holder_name: cardData.holderName.toUpperCase(),
            exp_month: parseInt(cardData.expMonth),
            exp_year: parseInt(cardData.expYear),
            cvv: cardData.cvv,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro Pagar.me:', error);
      throw new Error(error.message || 'Erro ao tokenizar cartão');
    }

    const data = await response.json();
    console.log('✅ Token gerado:', data.id);
    
    return data.id; // tok_xxxxx
  } catch (error: any) {
    console.error('❌ Erro na tokenização:', error);
    throw new Error(error.message || 'Não foi possível processar o cartão');
  }
};
