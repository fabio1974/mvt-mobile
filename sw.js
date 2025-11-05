/**
 * Service Worker simples para Push Notifications
 * MVT Mobile - Sistema de Entregas
 */

console.log("🔔 [SW] Service Worker para push notifications carregado");
console.log("🔔 [SW] Self:", self);
console.log("🔔 [SW] Registration:", self.registration);

// Event listener para notificações push
self.addEventListener("push", function (event) {
  console.log("🔔 [SW] Push notification recebida!", event);
  console.log("🔔 [SW] Event data:", event.data);

  let notificationData = {};

  try {
    if (event.data) {
      console.log("🔔 [SW] Event data text:", event.data.text());
      notificationData = event.data.json();
      console.log("🔔 [SW] Notification data parsed:", notificationData);
    } else {
      console.warn("⚠️ [SW] Event data is null!");
    }
  } catch (error) {
    console.error("❌ [SW] Erro ao processar dados da notificação:", error);
    // Tenta usar o texto direto se JSON falhar
    try {
      const text = event.data.text();
      console.log("🔔 [SW] Using text data:", text);
      notificationData = { title: "MVT Entregas", body: text };
    } catch (e) {
      console.error("❌ [SW] Erro ao ler texto:", e);
    }
  }

  const title = notificationData.title || "MVT Entregas";
  const options = {
    body: notificationData.body || "Nova entrega disponível!",
    icon: "/icon.png",
    badge: "/icon.png",
    tag: notificationData.tag || "mvt-notification",
    data: notificationData.data || {},
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  console.log("🔔 [SW] Mostrando notificação:", { title, options });

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => {
        console.log("✅ [SW] Notificação mostrada com sucesso!");
      })
      .catch((error) => {
        console.error("❌ [SW] Erro ao mostrar notificação:", error);
      })
  );
});

// Event listener para quando usuário clica na notificação
self.addEventListener("notificationclick", function (event) {
  console.log("👆 [SW] Usuário clicou na notificação:", event);
  console.log("👆 [SW] Notification data:", event.notification.data);

  event.notification.close();

  // Foca na janela existente ou abre uma nova
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        console.log("👆 [SW] Client list:", clientList);

        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ("focus" in client) {
            console.log("👆 [SW] Focusing client:", client.url);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          console.log("👆 [SW] Opening new window");
          return clients.openWindow("/");
        }
      })
  );
});

// Event listener para instalação do service worker
self.addEventListener("install", function (event) {
  console.log("🔧 [SW] Service Worker instalando...");
  self.skipWaiting();
  console.log("✅ [SW] Service Worker instalado");
});

// Event listener para ativação do service worker
self.addEventListener("activate", function (event) {
  console.log("🔧 [SW] Service Worker ativando...");
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log("✅ [SW] Service Worker ativado e controlando páginas");
    })
  );
});

// Log periódico para confirmar que SW está vivo
setInterval(() => {
  console.log("💓 [SW] Service Worker está vivo e ouvindo...");
}, 30000); // A cada 30 segundos
