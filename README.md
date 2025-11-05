# MVT Mobile - React Native App

Aplicação mobile para o sistema MVT, construída com **React Native** e **Expo**.

## 🚀 Tecnologias

- **React Native** com **Expo SDK 54**
- **TypeScript** para type safety
- **React Navigation** para navegação
- **Axios** para requisições HTTP
- **Expo Location** para GPS tracking
- **Expo Notifications** para push notifications
- **React Native Maps** para mapas
- **Expo Camera** para captura de fotos

## 📦 Estrutura do Projeto

```
src/
├── types/           # Tipos TypeScript (metadata, API responses)
├── services/        # Serviços (API, GPS, Notifications)
├── hooks/           # Custom hooks (useEntityCRUD, useAuth, etc)
├── components/      # Componentes reutilizáveis
│   ├── common/      # Botões, inputs, cards
│   ├── form/        # Formulários genéricos baseados em metadata
│   ├── list/        # Listas genéricas (FlatList)
│   ├── maps/        # Componentes de mapa
│   └── delivery/    # Componentes específicos de entregas
├── screens/         # Telas da aplicação
│   ├── auth/        # Login, perfil
│   ├── delivery/    # Entregas
│   └── generic/     # Telas genéricas (CRUD)
├── navigation/      # Configuração de navegação
├── utils/           # Utilitários (máscaras, validações)
├── styles/          # Tema global (cores, espaçamentos)
└── config/          # Configurações (env, constantes)
```

## 🛠️ Setup

### Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app no celular (iOS ou Android)

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npx expo start
```

### Executar

```bash
# Android
npx expo run:android

# iOS (requer Mac)
npx expo run:ios

# Web
npx expo start --web
```

## 📱 Features

### ✅ Implementadas
- [x] Estrutura base do projeto
- [x] Tipos TypeScript (metadata)
- [x] API client com interceptors
- [x] Utilitários de máscaras (CPF, CNPJ, telefone, CEP)
- [x] Tema global (cores, espaçamentos)
- [x] Configuração de ambiente

### 🚧 Em Desenvolvimento
- [ ] Autenticação (login, logout)
- [ ] Componentes de formulário genéricos
- [ ] Lista genérica (FlatList com metadata)
- [ ] GPS tracking em tempo real
- [ ] Push notifications
- [ ] Captura de fotos
- [ ] Modo offline

### 📋 Próximos Passos
1. Criar componentes base (Button, Input, Card)
2. Implementar tela de login
3. Criar EntityForm genérico baseado em metadata
4. Implementar lista de entregas
5. Adicionar GPS tracking
6. Configurar push notifications
7. Implementar captura de fotos
8. Adicionar modo offline

## 🔧 Configuração

### API URL

Edite `src/config/env.ts`:

```typescript
export const ENV = {
  API_URL: 'https://sua-api.com.br/api',
  GOOGLE_MAPS_API_KEY: 'SUA_CHAVE_AQUI',
  // ...
};
```

### Google Maps

1. Obtenha uma chave API no [Google Cloud Console](https://console.cloud.google.com/)
2. Ative as APIs: Maps SDK, Places API, Geocoding API
3. Adicione a chave em `src/config/env.ts`

### Firebase (Push Notifications)

1. Crie projeto no [Firebase Console](https://console.firebase.google.com/)
2. Baixe `google-services.json` (Android) e `GoogleService-Info.plist` (iOS)
3. Configure as credenciais em `app.json`

## 📚 Documentação

- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)

## 🤝 Contribuindo

1. Crie uma branch (`git checkout -b feature/nova-feature`)
2. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
3. Push para a branch (`git push origin feature/nova-feature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto é propriedade privada.

---

**MVT Mobile** - Desenvolvido com ❤️ usando React Native + Expo
