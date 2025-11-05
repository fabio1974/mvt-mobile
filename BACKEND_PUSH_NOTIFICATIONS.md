# Sistema de Notificações Push - Implementação Backend (Spring Boot)

## 📋 Visão Geral

Este documento descreve a implementação necessária no backend Spring Boot para suportar o sistema de notificações push do aplicativo móvel MVT. O frontend já está implementado e pronto para integração.

## 🗃️ Estrutura do Banco de Dados

### Migration - Tabela `user_push_tokens`

```sql
CREATE TABLE user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(500) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('mobile', 'web', 'tablet')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, token),
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_token (token)
);
```

### Migration - Tabela `delivery_rejections` (opcional - para analytics)

```sql
CREATE TABLE delivery_rejections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    reason VARCHAR(255),
    rejected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_delivery (delivery_id),
    INDEX idx_driver (driver_id)
);
```

## 🏗️ Estrutura de Classes Java

### 1. Entity - UserPushToken

```java
@Entity
@Table(name = "user_push_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPushToken {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "token", nullable = false, length = 500)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform", nullable = false)
    private Platform platform;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", nullable = false)
    private DeviceType deviceType;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum Platform {
        IOS("ios"),
        ANDROID("android"),
        WEB("web");

        private final String value;

        Platform(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }

    public enum DeviceType {
        MOBILE("mobile"),
        WEB("web"),
        TABLET("tablet");

        private final String value;

        DeviceType(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }
    }
}
```

### 2. Repository - UserPushTokenRepository

```java
@Repository
public interface UserPushTokenRepository extends JpaRepository<UserPushToken, UUID> {

    List<UserPushToken> findByUserIdAndIsActiveTrue(UUID userId);

    List<UserPushToken> findByUserIdAndPlatformAndDeviceTypeAndIsActiveTrue(
        UUID userId,
        UserPushToken.Platform platform,
        UserPushToken.DeviceType deviceType
    );

    Optional<UserPushToken> findByToken(String token);

    @Modifying
    @Query("UPDATE UserPushToken u SET u.isActive = false WHERE u.userId = :userId AND u.platform = :platform AND u.deviceType = :deviceType")
    void deactivateTokens(UUID userId, UserPushToken.Platform platform, UserPushToken.DeviceType deviceType);

    @Modifying
    @Query("UPDATE UserPushToken u SET u.isActive = false WHERE u.userId = :userId")
    void deactivateAllUserTokens(UUID userId);
}
```

### 3. DTOs

```java
// Request DTO
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterPushTokenRequest {

    @NotBlank(message = "Token é obrigatório")
    private String token;

    @NotBlank(message = "Platform é obrigatória")
    private String platform;

    @NotBlank(message = "DeviceType é obrigatório")
    private String deviceType;
}

// Response DTO
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PushTokenResponse {
    private boolean success;
    private String message;
}

// Notification Data DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryNotificationData {
    private String type;
    private String deliveryId;
    private String message;
    private DeliveryData deliveryData;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeliveryData {
        private String clientName;
        private BigDecimal value;
        private String address;
        private Double pickupLatitude;
        private Double pickupLongitude;
        private Double deliveryLatitude;
        private Double deliveryLongitude;
    }
}
```

## 🔧 Implementação dos Serviços

### 1. Service - PushNotificationService

```java
@Service
@Slf4j
public class PushNotificationService {

    @Value("${expo.access-token:your-expo-access-token}")
    private String expoAccessToken;

    private final RestTemplate restTemplate;
    private final UserPushTokenRepository pushTokenRepository;
    private final ObjectMapper objectMapper;

    public PushNotificationService(UserPushTokenRepository pushTokenRepository, ObjectMapper objectMapper) {
        this.pushTokenRepository = pushTokenRepository;
        this.objectMapper = objectMapper;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Envia notificação de convite de entrega para um motorista específico
     */
    public void sendDeliveryInvite(UUID driverId, UUID deliveryId, Delivery delivery) {
        try {
            log.info("Enviando convite de entrega {} para motorista {}", deliveryId, driverId);

            // Busca tokens ativos do motorista
            List<UserPushToken> tokens = pushTokenRepository.findByUserIdAndIsActiveTrue(driverId);

            if (tokens.isEmpty()) {
                log.warn("Nenhum token push ativo encontrado para motorista {}", driverId);
                return;
            }

            // Prepara dados da notificação
            DeliveryNotificationData notificationData = buildDeliveryNotificationData(delivery);

            // Cria mensagem push
            ExpoPushMessage pushMessage = ExpoPushMessage.builder()
                .to(tokens.stream().map(UserPushToken::getToken).collect(Collectors.toList()))
                .title("🚚 Nova Entrega Disponível!")
                .body(String.format("Entrega de R$ %.2f - %s", delivery.getValue(), getClientName(delivery)))
                .data(notificationData)
                .sound("default")
                .priority("high")
                .channelId("delivery")
                .build();

            // Envia notificação
            sendExpoPushNotification(Collections.singletonList(pushMessage));

            log.info("Notificação enviada com sucesso para {} tokens", tokens.size());

        } catch (Exception e) {
            log.error("Erro ao enviar convite de entrega para motorista {}: {}", driverId, e.getMessage(), e);
        }
    }

    /**
     * Envia notificação via Expo Push API
     */
    private void sendExpoPushNotification(List<ExpoPushMessage> messages) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + expoAccessToken);
            headers.set("Accept", "application/json");

            HttpEntity<List<ExpoPushMessage>> request = new HttpEntity<>(messages, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                "https://exp.host/--/api/v2/push/send",
                request,
                String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Notificações push enviadas com sucesso");
            } else {
                log.error("Erro ao enviar notificações push. Status: {}, Body: {}",
                    response.getStatusCode(), response.getBody());
            }

        } catch (Exception e) {
            log.error("Erro na comunicação com Expo Push API: {}", e.getMessage(), e);
        }
    }

    private DeliveryNotificationData buildDeliveryNotificationData(Delivery delivery) {
        return DeliveryNotificationData.builder()
            .type("delivery_invite")
            .deliveryId(delivery.getId().toString())
            .message("Nova entrega próxima à sua localização")
            .deliveryData(DeliveryNotificationData.DeliveryData.builder()
                .clientName(getClientName(delivery))
                .value(delivery.getValue())
                .address(delivery.getDeliveryAddress())
                .pickupLatitude(delivery.getPickupLatitude())
                .pickupLongitude(delivery.getPickupLongitude())
                .deliveryLatitude(delivery.getDeliveryLatitude())
                .deliveryLongitude(delivery.getDeliveryLongitude())
                .build())
            .build();
    }

    private String getClientName(Delivery delivery) {
        return delivery.getCustomer() != null ? delivery.getCustomer().getName() : "Cliente não informado";
    }
}

// Classe auxiliar para mensagem Expo
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class ExpoPushMessage {
    private List<String> to;
    private String title;
    private String body;
    private Object data;
    private String sound;
    private String priority;
    private String channelId;
}
```

### 2. Service - UserPushTokenService

```java
@Service
@Transactional
@Slf4j
public class UserPushTokenService {

    private final UserPushTokenRepository pushTokenRepository;

    public UserPushTokenService(UserPushTokenRepository pushTokenRepository) {
        this.pushTokenRepository = pushTokenRepository;
    }

    /**
     * Registra novo token push para um usuário
     */
    public PushTokenResponse registerPushToken(UUID userId, RegisterPushTokenRequest request) {
        try {
            UserPushToken.Platform platform = UserPushToken.Platform.valueOf(request.getPlatform().toUpperCase());
            UserPushToken.DeviceType deviceType = UserPushToken.DeviceType.valueOf(request.getDeviceType().toUpperCase());

            // Desativa tokens antigos para o mesmo usuário/plataforma/dispositivo
            pushTokenRepository.deactivateTokens(userId, platform, deviceType);

            // Cria novo token
            UserPushToken newToken = UserPushToken.builder()
                .userId(userId)
                .token(request.getToken())
                .platform(platform)
                .deviceType(deviceType)
                .isActive(true)
                .build();

            pushTokenRepository.save(newToken);

            log.info("Token push registrado com sucesso para usuário {} na plataforma {}", userId, platform);

            return PushTokenResponse.builder()
                .success(true)
                .message("Token registrado com sucesso")
                .build();

        } catch (IllegalArgumentException e) {
            log.error("Plataforma ou tipo de dispositivo inválido: {}", e.getMessage());
            return PushTokenResponse.builder()
                .success(false)
                .message("Plataforma ou tipo de dispositivo inválido")
                .build();
        } catch (Exception e) {
            log.error("Erro ao registrar token push para usuário {}: {}", userId, e.getMessage(), e);
            return PushTokenResponse.builder()
                .success(false)
                .message("Erro interno do servidor")
                .build();
        }
    }

    /**
     * Remove token push específico
     */
    public PushTokenResponse unregisterPushToken(UUID userId, String token) {
        try {
            Optional<UserPushToken> tokenOpt = pushTokenRepository.findByToken(token);

            if (tokenOpt.isPresent() && tokenOpt.get().getUserId().equals(userId)) {
                UserPushToken pushToken = tokenOpt.get();
                pushToken.setIsActive(false);
                pushTokenRepository.save(pushToken);

                log.info("Token push removido com sucesso para usuário {}", userId);
                return PushTokenResponse.builder()
                    .success(true)
                    .message("Token removido com sucesso")
                    .build();
            } else {
                return PushTokenResponse.builder()
                    .success(false)
                    .message("Token não encontrado")
                    .build();
            }

        } catch (Exception e) {
            log.error("Erro ao remover token push: {}", e.getMessage(), e);
            return PushTokenResponse.builder()
                .success(false)
                .message("Erro interno do servidor")
                .build();
        }
    }

    /**
     * Remove todos os tokens de um usuário (logout)
     */
    public void unregisterAllUserTokens(UUID userId) {
        try {
            pushTokenRepository.deactivateAllUserTokens(userId);
            log.info("Todos os tokens do usuário {} foram desativados", userId);
        } catch (Exception e) {
            log.error("Erro ao desativar tokens do usuário {}: {}", userId, e.getMessage(), e);
        }
    }
}
```

## 🎮 Controllers

### PushNotificationController

```java
@RestController
@RequestMapping("/api/users")
@Slf4j
public class PushNotificationController {

    private final UserPushTokenService pushTokenService;

    public PushNotificationController(UserPushTokenService pushTokenService) {
        this.pushTokenService = pushTokenService;
    }

    /**
     * POST /api/users/push-token
     * Registra token push para notificações
     */
    @PostMapping("/push-token")
    public ResponseEntity<PushTokenResponse> registerPushToken(
            @Valid @RequestBody RegisterPushTokenRequest request,
            Authentication authentication) {

        try {
            UUID userId = getUserIdFromAuthentication(authentication);
            PushTokenResponse response = pushTokenService.registerPushToken(userId, request);

            if (response.isSuccess()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }

        } catch (Exception e) {
            log.error("Erro no endpoint de registro de token push: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(PushTokenResponse.builder()
                    .success(false)
                    .message("Erro interno do servidor")
                    .build());
        }
    }

    /**
     * DELETE /api/users/push-token
     * Remove token push específico
     */
    @DeleteMapping("/push-token")
    public ResponseEntity<PushTokenResponse> unregisterPushToken(
            @RequestBody Map<String, String> request,
            Authentication authentication) {

        try {
            UUID userId = getUserIdFromAuthentication(authentication);
            String token = request.get("token");

            if (token == null || token.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(PushTokenResponse.builder()
                        .success(false)
                        .message("Token é obrigatório")
                        .build());
            }

            PushTokenResponse response = pushTokenService.unregisterPushToken(userId, token);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Erro no endpoint de remoção de token push: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(PushTokenResponse.builder()
                    .success(false)
                    .message("Erro interno do servidor")
                    .build());
        }
    }

    private UUID getUserIdFromAuthentication(Authentication authentication) {
        // Implementar conforme sua estratégia de autenticação
        // Exemplo:
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        return userPrincipal.getId();
    }
}
```

## 🚀 Integração com Sistema de Entregas

### Modificação no DeliveryService

```java
@Service
@Transactional
@Slf4j
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;

    // ... outros métodos

    /**
     * Cria nova entrega e notifica motoristas próximos
     */
    public Delivery createDelivery(CreateDeliveryRequest request) {
        // 1. Cria a entrega
        Delivery delivery = new Delivery();
        // ... configurar campos da entrega
        delivery = deliveryRepository.save(delivery);

        // 2. Busca motoristas próximos (implementar conforme sua lógica)
        List<UUID> nearbyDrivers = findNearbyDrivers(
            delivery.getPickupLatitude(),
            delivery.getPickupLongitude(),
            5.0 // 5km de raio
        );

        // 3. Envia notificação para cada motorista
        for (UUID driverId : nearbyDrivers) {
            try {
                pushNotificationService.sendDeliveryInvite(driverId, delivery.getId(), delivery);
            } catch (Exception e) {
                log.error("Erro ao enviar notificação para motorista {}: {}", driverId, e.getMessage());
                // Não falha a criação da entrega por erro de notificação
            }
        }

        return delivery;
    }

    /**
     * Aceita entrega e notifica outros motoristas
     */
    public DeliveryResponse acceptDelivery(UUID deliveryId, UUID driverId) {
        try {
            Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new EntityNotFoundException("Entrega não encontrada"));

            if (!delivery.getStatus().equals(DeliveryStatus.PENDING)) {
                return DeliveryResponse.builder()
                    .success(false)
                    .error("Entrega não está mais disponível")
                    .build();
            }

            // Aceita a entrega
            delivery.setDriverId(driverId);
            delivery.setStatus(DeliveryStatus.ACCEPTED);
            delivery.setAcceptedAt(LocalDateTime.now());

            deliveryRepository.save(delivery);

            // TODO: Notificar outros motoristas que entrega foi aceita

            return DeliveryResponse.builder()
                .success(true)
                .delivery(delivery)
                .build();

        } catch (Exception e) {
            log.error("Erro ao aceitar entrega {}: {}", deliveryId, e.getMessage(), e);
            return DeliveryResponse.builder()
                .success(false)
                .error("Erro interno do servidor")
                .build();
        }
    }

    /**
     * Busca entregas disponíveis com paginação
     */
    @GetMapping
    public ResponseEntity<Page<Delivery>> getDeliveries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            Authentication authentication) {

        try {
            Pageable pageable = PageRequest.of(page, size);

            // Se for motorista, busca apenas entregas disponíveis ou suas próprias
            UUID userId = getUserIdFromAuthentication(authentication);
            String userRole = getUserRoleFromAuthentication(authentication);

            Page<Delivery> deliveries;

            if ("COURIER".equals(userRole) || "DELIVERY".equals(userRole) || "ENTREGADOR".equals(userRole)) {
                // Para motoristas: só entregas pendentes ou suas próprias
                if (status == null || "PENDING".equals(status)) {
                    deliveries = deliveryRepository.findByStatusOrDriverId("PENDING", userId, pageable);
                } else {
                    deliveries = deliveryRepository.findByDriverId(userId, pageable);
                }
            } else {
                // Para admins: todas as entregas
                if (status != null) {
                    deliveries = deliveryRepository.findByStatus(status, pageable);
                } else {
                    deliveries = deliveryRepository.findAll(pageable);
                }
            }

            return ResponseEntity.ok(deliveries);

        } catch (Exception e) {
            log.error("Erro ao buscar entregas: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Busca motoristas próximos (implementar conforme sua estratégia)
     */
    private List<UUID> findNearbyDrivers(Double latitude, Double longitude, Double radiusKm) {
        // Implementar busca por geolocalização
        // Exemplo usando query spatial ou cálculo de distância
        return userRepository.findNearbyDrivers(latitude, longitude, radiusKm);
    }
}
```

## ⚙️ Configurações

### application.yml

```yaml
expo:
  access-token: ${EXPO_ACCESS_TOKEN:your-expo-access-token}

spring:
  datasource:
    # suas configurações de banco

logging:
  level:
    com.seuapp.service.PushNotificationService: DEBUG
    com.seuapp.service.UserPushTokenService: DEBUG
```

### Dependências (pom.xml)

```xml
<!-- Para requisições HTTP -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Para validação -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<!-- Jackson para JSON -->
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
</dependency>
```

## 🧪 Endpoint de Teste

```java
@RestController
@RequestMapping("/api/test")
public class TestNotificationController {

    private final PushNotificationService pushNotificationService;

    /**
     * POST /api/test/delivery-invite/{driverId}
     * Simula envio de convite de entrega (apenas para desenvolvimento)
     */
    @PostMapping("/delivery-invite/{driverId}")
    public ResponseEntity<String> simulateDeliveryInvite(@PathVariable UUID driverId) {
        try {
            // Criar entrega fake para teste
            Delivery testDelivery = new Delivery();
            testDelivery.setId(UUID.randomUUID());
            testDelivery.setValue(new BigDecimal("25.50"));
            testDelivery.setDeliveryAddress("Rua Teste, 123 - Centro");
            // ... outros campos

            pushNotificationService.sendDeliveryInvite(driverId, testDelivery.getId(), testDelivery);

            return ResponseEntity.ok("Notificação de teste enviada");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erro: " + e.getMessage());
        }
    }
}
```

## 📱 Dados Esperados pelo Frontend

O frontend espera receber notificações com esta estrutura:

```json
{
  "title": "🚚 Nova Entrega Disponível!",
  "body": "Entrega de R$ 25,50 - João Silva",
  "data": {
    "type": "delivery_invite",
    "deliveryId": "uuid-da-entrega",
    "message": "Nova entrega próxima à sua localização",
    "deliveryData": {
      "clientName": "João Silva",
      "value": 25.5,
      "address": "Rua das Flores, 123 - Centro",
      "pickupLatitude": -23.5505,
      "pickupLongitude": -46.6333,
      "deliveryLatitude": -23.5489,
      "deliveryLongitude": -46.6388
    }
  }
}
```

## 🔐 Considerações de Segurança

1. **Token Expo**: Mantenha o access token em variáveis de ambiente
2. **Validação**: Sempre valide se o usuário pode receber notificações
3. **Rate Limiting**: Implemente limitação de envio de notificações
4. **Logs**: Monitore envios e falhas de notificação
5. **Cleanup**: Remova tokens inativos periodicamente

## 📊 Monitoramento

Considere implementar:

- Métricas de entrega de notificações
- Dashboard de tokens ativos por usuário
- Alertas para falhas de envio
- Relatórios de aceitação/rejeição de entregas

---

**Frontend já implementado e pronto para integração!** 🚀

Endpoints necessários:

- ✅ `POST /api/users/push-token` (registrar token)
- ✅ `DELETE /api/users/push-token` (remover token)
- ✅ `GET /api/deliveries?page=0&size=10` (listar entregas paginadas)
- ✅ `GET /api/deliveries/my` (entregas do motorista logado)
- ✅ `GET /api/deliveries/{id}` (detalhes de uma entrega)
- ✅ `POST /api/deliveries/{id}/accept` (aceitar entrega)
- ✅ `POST /api/deliveries/{id}/reject` (rejeitar entrega)
- ✅ `PATCH /api/deliveries/{id}/status` (atualizar status da entrega)

## 📡 Endpoints de Deliveries

### Controller - DeliveryController (complemento)

```java
@RestController
@RequestMapping("/api/deliveries")
@Slf4j
public class DeliveryController {

    private final DeliveryService deliveryService;
    private final PushNotificationService pushNotificationService;

    /**
     * GET /api/deliveries?page=0&size=10
     * Lista entregas com paginação
     */
    @GetMapping
    public ResponseEntity<Page<Delivery>> getDeliveries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            Authentication authentication) {

        try {
            Pageable pageable = PageRequest.of(page, size);
            UUID userId = getUserIdFromAuthentication(authentication);
            String userRole = getUserRoleFromAuthentication(authentication);

            Page<Delivery> deliveries;

            if ("COURIER".equals(userRole)) {
                // Para motoristas: só entregas pendentes ou suas próprias
                deliveries = deliveryService.getAvailableDeliveriesForDriver(userId, pageable);
            } else {
                // Para admins: todas as entregas
                deliveries = deliveryService.getAllDeliveries(status, pageable);
            }

            return ResponseEntity.ok(deliveries);

        } catch (Exception e) {
            log.error("Erro ao buscar entregas: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * POST /api/deliveries/:id/accept
     * Aceita uma entrega
     */
    @PostMapping("/{id}/accept")
    public ResponseEntity<DeliveryResponse> acceptDelivery(
            @PathVariable UUID id,
            Authentication authentication) {

        try {
            UUID driverId = getUserIdFromAuthentication(authentication);
            DeliveryResponse response = deliveryService.acceptDelivery(id, driverId);

            if (response.isSuccess()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }

        } catch (Exception e) {
            log.error("Erro ao aceitar entrega {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(DeliveryResponse.builder()
                    .success(false)
                    .error("Erro interno do servidor")
                    .build());
        }
    }

    /**
     * POST /api/deliveries/:id/reject
     * Rejeita uma entrega
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<DeliveryResponse> rejectDelivery(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {

        try {
            UUID driverId = getUserIdFromAuthentication(authentication);
            String reason = body != null ? body.get("reason") : "Não informado";

            DeliveryResponse response = deliveryService.rejectDelivery(id, driverId, reason);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Erro ao rejeitar entrega {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(DeliveryResponse.builder()
                    .success(false)
                    .error("Erro interno do servidor")
                    .build());
        }
    }

    private UUID getUserIdFromAuthentication(Authentication authentication) {
        // Implementar conforme sua estratégia de autenticação
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        return userPrincipal.getId();
    }

    private String getUserRoleFromAuthentication(Authentication authentication) {
        // Implementar conforme sua estratégia de autenticação
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        return userPrincipal.getRole();
    }
}
```
