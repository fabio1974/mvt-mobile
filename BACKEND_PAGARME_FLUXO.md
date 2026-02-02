# Backend Pagar.me - Fluxo Correto para Salvar Cartões

## Problema Atual

❌ Backend retorna **400 com body vazio** quando recebe `POST /customer-cards`  
❌ Cartão não aparece no dashboard do Pagar.me  
✅ Frontend gera token corretamente: `token_pYXKORDSG9Fq6EN7`

## Fluxo Correto (API v5 Pagar.me)

### 1. Frontend → Pagar.me (✅ FUNCIONANDO)
```typescript
// pagarmeService.ts - JÁ IMPLEMENTADO E FUNCIONANDO
const token = await tokenizeCard({
  number: '4111111111111111',
  holderName: 'FABIO BARROS PRF',
  expMonth: '12',
  expYear: '2025',
  cvv: '123'
});
// Retorna: token_pYXKORDSG9Fq6EN7
```

### 2. Frontend → Backend (✅ FUNCIONANDO)
```http
POST http://192.168.18.65:8080/api/customer-cards
Authorization: Bearer [JWT_TOKEN]
Content-Type: application/json

{
  "cardToken": "token_pYXKORDSG9Fq6EN7",
  "setAsDefault": true
}
```

### 3. Backend → Pagar.me (❌ NÃO ESTÁ FUNCIONANDO)

O backend **PRECISA** fazer estas chamadas:

#### Passo 3.1: Criar ou buscar Customer
```http
POST https://api.pagar.me/core/v5/customers
Authorization: Basic c2tfdGVzdF83NTIzMjBhYTMwODI0OGU1OGY5MjZmM2NhMjEwZmMxMTo=
Content-Type: application/json

{
  "name": "Fabio Barros PRF",
  "email": "fabio@example.com",
  "document": "39776425020",  // CPF sem pontuação
  "type": "individual",
  "document_type": "CPF",
  "phones": {
    "mobile_phone": {
      "country_code": "55",
      "area_code": "11",
      "number": "999999999"
    }
  }
}
```

**Importante:** 
- Use a **secret key** (sk_test_752320aa308248e58f926f3ca210fc11)
- Encode em Base64 para Authorization: `sk_test_...:` (secret key + dois pontos)
- Se o customer já existir, busque pelo CPF antes de criar

#### Passo 3.2: Criar Card no Customer
```http
POST https://api.pagar.me/core/v5/customers/{customer_id}/cards
Authorization: Basic c2tfdGVzdF83NTIzMjBhYTMwODI0OGU1OGY5MjZmM2NhMjEwZmMxMTo=
Content-Type: application/json

{
  "token": "token_pYXKORDSG9Fq6EN7"
}
```

**Resposta esperada:**
```json
{
  "id": "card_abcd1234",
  "customer_id": "cus_xyz789",
  "first_six_digits": "411111",
  "last_four_digits": "1111",
  "brand": "Visa",
  "holder_name": "FABIO BARROS PRF",
  "exp_month": 12,
  "exp_year": 2025,
  "status": "active",
  "created_at": "2025-02-02T10:30:00Z"
}
```

### 4. Backend → Banco de Dados Local
```sql
INSERT INTO customer_cards (
  user_id,
  pagarme_card_id,
  pagarme_customer_id,
  last_four_digits,
  brand,
  holder_name,
  expiration,
  is_default,
  is_active,
  created_at
) VALUES (
  123,  -- ID do usuário logado
  'card_abcd1234',  -- Da resposta do Pagar.me
  'cus_xyz789',
  '1111',
  'Visa',
  'FABIO BARROS PRF',
  '12/2025',
  true,
  true,
  NOW()
);
```

### 5. Backend → Frontend (✅ DEVE RETORNAR)
```json
{
  "id": 1,
  "lastFourDigits": "1111",
  "brand": "Visa",
  "holderName": "FABIO BARROS PRF",
  "expiration": "12/25",
  "isDefault": true,
  "isActive": true,
  "isExpired": false,
  "maskedNumber": "Visa •••• 1111",
  "createdAt": "2025-02-02T10:30:00Z"
}
```

## Verificações Necessárias no Backend

### ✅ Checklist de Implementação

1. **Secret Key configurada?**
   ```java
   // application.properties ou application.yml
   pagarme.secret.key=sk_test_752320aa308248e58f926f3ca210fc11
   ```

2. **Authorization header correto?**
   ```java
   String auth = Base64.getEncoder().encodeToString(
     (secretKey + ":").getBytes()
   );
   headers.put("Authorization", "Basic " + auth);
   ```

3. **Customer existe ou é criado?**
   ```java
   Customer customer = findOrCreateCustomer(user.getCpf());
   ```

4. **Card é criado no Pagar.me?**
   ```java
   Card card = pagarmeClient.createCard(
     customer.getPagarmeId(), 
     cardToken
   );
   ```

5. **Tratamento de erros?**
   ```java
   try {
     // chamadas Pagar.me
   } catch (PagarmeException e) {
     log.error("Erro Pagar.me: {}", e.getErrors());
     return ResponseEntity.badRequest()
       .body(Map.of("error", e.getMessage()));
   }
   ```

## Como Debugar

### 1. Verificar logs do backend
```bash
# Procure por:
- "POST /customer-cards"
- Erros de integração com Pagar.me
- Stack traces relacionados a HTTP 400
```

### 2. Testar criação de Customer manualmente
```bash
curl -X POST 'https://api.pagar.me/core/v5/customers' \
  -H 'Authorization: Basic c2tfdGVzdF83NTIzMjBhYTMwODI0OGU1OGY5MjZmM2NhMjEwZmMxMTo=' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Teste",
    "email": "teste@example.com",
    "document": "12345678901",
    "type": "individual",
    "document_type": "CPF"
  }'
```

### 3. Testar criação de Card manualmente
```bash
# Substitua {customer_id} pelo ID retornado acima
curl -X POST 'https://api.pagar.me/core/v5/customers/{customer_id}/cards' \
  -H 'Authorization: Basic c2tfdGVzdF83NTIzMjBhYTMwODI0OGU1OGY5MjZmM2NhMjEwZmMxMTo=' \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "token_pYXKORDSG9Fq6EN7"
  }'
```

## Código de Exemplo (Java/Spring)

```java
@Service
public class PagarmeService {
    
    @Value("${pagarme.secret.key}")
    private String secretKey;
    
    private static final String PAGARME_API = "https://api.pagar.me/core/v5";
    
    public Card createCardFromToken(String userId, String cardToken) {
        // 1. Buscar usuário
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        
        // 2. Criar ou buscar customer no Pagar.me
        Customer customer = findOrCreateCustomer(user);
        
        // 3. Criar card no Pagar.me
        Card pagarmeCard = createCardInPagarme(customer.getPagarmeId(), cardToken);
        
        // 4. Salvar no banco local
        CustomerCard localCard = new CustomerCard();
        localCard.setUserId(userId);
        localCard.setPagarmeCardId(pagarmeCard.getId());
        localCard.setPagarmeCustomerId(customer.getPagarmeId());
        localCard.setLastFourDigits(pagarmeCard.getLastFourDigits());
        localCard.setBrand(pagarmeCard.getBrand());
        localCard.setHolderName(pagarmeCard.getHolderName());
        // ... outros campos
        
        return customerCardRepository.save(localCard);
    }
    
    private Customer findOrCreateCustomer(User user) {
        // Verificar se já existe no banco local
        Optional<Customer> existing = customerRepository
            .findByUserCpf(user.getCpf());
        
        if (existing.isPresent()) {
            return existing.get();
        }
        
        // Criar no Pagar.me
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + getEncodedSecretKey());
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Map<String, Object> body = new HashMap<>();
        body.put("name", user.getName());
        body.put("email", user.getEmail());
        body.put("document", user.getCpf().replaceAll("[^0-9]", ""));
        body.put("type", "individual");
        body.put("document_type", "CPF");
        
        HttpEntity<Map<String, Object>> request = 
            new HttpEntity<>(body, headers);
        
        ResponseEntity<Map> response = restTemplate.postForEntity(
            PAGARME_API + "/customers",
            request,
            Map.class
        );
        
        // Salvar no banco local
        Customer customer = new Customer();
        customer.setUserId(user.getId());
        customer.setPagarmeId((String) response.getBody().get("id"));
        customer.setCpf(user.getCpf());
        
        return customerRepository.save(customer);
    }
    
    private Card createCardInPagarme(String customerId, String cardToken) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + getEncodedSecretKey());
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Map<String, String> body = Map.of("token", cardToken);
        HttpEntity<Map<String, String>> request = 
            new HttpEntity<>(body, headers);
        
        ResponseEntity<Card> response = restTemplate.postForEntity(
            PAGARME_API + "/customers/" + customerId + "/cards",
            request,
            Card.class
        );
        
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new PagarmeException("Erro ao criar card: " + 
                response.getBody());
        }
        
        return response.getBody();
    }
    
    private String getEncodedSecretKey() {
        return Base64.getEncoder().encodeToString(
            (secretKey + ":").getBytes()
        );
    }
}
```

## Próximos Passos

1. ✅ **Frontend está correto** - não precisa alterar nada
2. ❌ **Backend precisa implementar** o fluxo acima
3. 🔍 **Verificar logs** do backend para ver erro específico
4. 🧪 **Testar manualmente** com curl as chamadas ao Pagar.me
5. 📊 **Após fix, verificar** no dashboard: https://dashboard.pagar.me/ → Clientes → CPF 397.764.250-20

## Referências

- **API v5 Pagar.me:** https://docs.pagar.me/reference/criar-cliente
- **Criar Card:** https://docs.pagar.me/reference/criar-cartao
- **Secret Key:** sk_test_752320aa308248e58f926f3ca210fc11
- **Public Key:** pk_test_KXLDBZ1i8rUx2JnO (já configurada no frontend)

---

**Autor:** GitHub Copilot  
**Data:** 02/02/2026  
**Status:** Frontend ✅ Completo | Backend ❌ Requer implementação
