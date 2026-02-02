// Configuração do Pagar.me
export const PAGARME_CONFIG = {
  // ⚠️ IMPORTANTE: Trocar para produção quando for deploy!
  PUBLIC_KEY: 'pk_test_xxxxxxxxxxxxxxxx', // TODO: Substituir pela chave real do Pagar.me
  API_URL: 'https://api.pagar.me/core/v5',
  
  // Sandbox = true para testes, false para produção
  IS_SANDBOX: true,
};

// Cartões de teste (apenas sandbox)
export const TEST_CARDS = {
  visa_approved: {
    number: '4242424242424242',
    cvv: '123',
    expMonth: '12',
    expYear: '2030',
    holderName: 'JOAO SILVA',
  },
  visa_declined: {
    number: '4000000000000002',
    cvv: '123',
    expMonth: '12',
    expYear: '2030',
    holderName: 'JOAO SILVA',
  },
  mastercard: {
    number: '5555555555554444',
    cvv: '123',
    expMonth: '12',
    expYear: '2030',
    holderName: 'JOAO SILVA',
  },
  amex: {
    number: '378282246310005',
    cvv: '1234',
    expMonth: '12',
    expYear: '2030',
    holderName: 'JOAO SILVA',
  },
  elo: {
    number: '6362970700000001',
    cvv: '123',
    expMonth: '12',
    expYear: '2030',
    holderName: 'JOAO SILVA',
  },
};
