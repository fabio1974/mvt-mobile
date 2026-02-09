import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeliveryType } from '../../types/payment';
import { deliveryService } from '../../services/deliveryService';
import { authService } from '../../services/authService';
import { paymentService } from '../../services/paymentService';
import { userAddressService, InitialCenter } from '../../services/userAddressService';
import { freightService, FreightSimulationResponse } from '../../services/freightService';

// Import das etapas do wizard
import {
  StepTypeSelector,
  StepOriginAddress,
  StepDestinationAddress,
  StepDeliveryDetails,
  StepConfirmation,
} from './wizard-steps';

interface CreateDeliveryWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (delivery: any) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  userRole?: string; // CLIENT = estabelecimento (só DELIVERY), CUSTOMER = cliente (DELIVERY ou RIDE)
}

export interface WizardData {
  // Tipo de serviço
  deliveryType: DeliveryType;
  
  // Endereços
  fromAddress: string;
  fromLatitude: number | null;
  fromLongitude: number | null;
  fromAddressConfirmed: boolean;
  toAddress: string;
  toLatitude: number | null;
  toLongitude: number | null;
  toAddressConfirmed: boolean;
  
  // Detalhes da entrega (só para DELIVERY)
  itemDescription: string;
  recipientName: string;
  recipientPhone: string;
  itemValue: string; // valor a cobrar do destinatário na entrega (COD)
  
  // Valores calculados
  distanceKm: number | null;
  totalAmount: string;
  
  // Simulação de frete
  freightSimulation: FreightSimulationResponse | null;
  freightLoading: boolean;
  freightError: string | null;
  routePolyline: string | null; // encoded polyline da rota Google
}

const INITIAL_DATA: WizardData = {
  deliveryType: 'DELIVERY',
  fromAddress: '',
  fromLatitude: null,
  fromLongitude: null,
  fromAddressConfirmed: false,
  toAddress: '',
  toLatitude: null,
  toLongitude: null,
  toAddressConfirmed: false,
  itemDescription: '',
  recipientName: '',
  recipientPhone: '',
  itemValue: '',
  distanceKm: null,
  totalAmount: '',
  freightSimulation: null,
  freightLoading: false,
  freightError: null,
  routePolyline: null,
};

export default function CreateDeliveryWizard({
  visible,
  onClose,
  onSuccess,
  userLocation,
  userRole,
}: CreateDeliveryWizardProps) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // Centro inicial do mapa - definido UMA VEZ no início do fluxo
  const [initialMapCenter, setInitialMapCenter] = useState<InitialCenter | null>(null);
  const [isLoadingCenter, setIsLoadingCenter] = useState(false);

  // Listener do teclado para esconder botões
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // CLIENT (estabelecimento) só faz entregas, não precisa escolher tipo
  // CUSTOMER pode escolher entre DELIVERY ou RIDE
  const skipTypeSelection = userRole?.toUpperCase() === 'CLIENT';

  // Busca o centro inicial do mapa quando o wizard abre
  useEffect(() => {
    const loadInitialCenter = async () => {
      if (!visible) {
        // Reset do centro inicial quando fecha o wizard
        setInitialMapCenter(null);
        return;
      }
      
      setIsLoadingCenter(true);
      try {
        console.log('🗺️ [Wizard] Buscando centro inicial do mapa...');
        const center = await userAddressService.getInitialCenter(userLocation);
        setInitialMapCenter(center);
        console.log('✅ [Wizard] Centro inicial definido:', center);
      } catch (error) {
        console.error('❌ [Wizard] Erro ao buscar centro inicial:', error);
        // Fallback para userLocation ou Sobral
        if (userLocation) {
          setInitialMapCenter({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            source: 'device_location',
          });
        } else {
          setInitialMapCenter({
            latitude: -3.6880,
            longitude: -40.3497,
            source: 'fallback',
          });
        }
      } finally {
        setIsLoadingCenter(false);
      }
    };
    
    loadInitialCenter();
  }, [visible, userLocation]);

  // Quando o initialMapCenter for carregado, preenche os endereços baseado no userRole
  useEffect(() => {
    if (!initialMapCenter) return;
    
    const isClient = userRole?.toUpperCase() === 'CLIENT';
    
    // CLIENT (estabelecimento): usa o endereço default cadastrado
    if (isClient && initialMapCenter.source === 'user_address' && initialMapCenter.address) {
      console.log('📍 [Wizard] CLIENT - Preenchendo endereços com endereço cadastrado:', initialMapCenter.address);
      setWizardData(prev => ({
        ...prev,
        // Preenche origem com endereço cadastrado
        fromAddress: prev.fromAddress || initialMapCenter.address!,
        fromLatitude: prev.fromLatitude ?? initialMapCenter.latitude,
        fromLongitude: prev.fromLongitude ?? initialMapCenter.longitude,
        // Preenche destino também (se ainda não tiver)
        toAddress: prev.toAddress || initialMapCenter.address!,
        toLatitude: prev.toLatitude ?? initialMapCenter.latitude,
        toLongitude: prev.toLongitude ?? initialMapCenter.longitude,
      }));
    }
    // CUSTOMER: origem é a localização do GPS - NÃO preenche o endereço por extenso
    // O AddressSelector vai buscar via reverseGeocode
    else if (!isClient) {
      console.log('📍 [Wizard] CUSTOMER - Usando localização GPS, endereço será buscado pelo mapa');
      setWizardData(prev => ({
        ...prev,
        // Apenas seta as coordenadas, o endereço será buscado pelo reverseGeocode
        fromLatitude: prev.fromLatitude ?? initialMapCenter.latitude,
        fromLongitude: prev.fromLongitude ?? initialMapCenter.longitude,
        toLatitude: prev.toLatitude ?? initialMapCenter.latitude,
        toLongitude: prev.toLongitude ?? initialMapCenter.longitude,
      }));
    }
  }, [initialMapCenter, userRole]);

  // Reset completo do wizard quando abre/fecha
  useEffect(() => {
    if (visible) {
      // Se for CLIENT, começa no step 2 (origem) e força DELIVERY
      if (skipTypeSelection) {
        setCurrentStep(2);
        setWizardData({ ...INITIAL_DATA, deliveryType: 'DELIVERY' });
      } else {
        setCurrentStep(1);
        setWizardData(INITIAL_DATA);
      }
    } else {
      // Reset completo quando fecha - limpa todos os dados
      setWizardData(INITIAL_DATA);
      setCurrentStep(1);
      console.log('🔄 [Wizard] Reset completo - todas as variáveis limpas');
    }
  }, [visible, skipTypeSelection]);

  // Determina total de steps baseado no tipo e role
  const getTotalSteps = (): number => {
    // Se for CLIENT, não tem step de seleção de tipo
    // CLIENT (só DELIVERY): 1(origem) + 2(destino) + 3(detalhes) + 4(confirmação) = 4 steps
    // CUSTOMER RIDE: 1(tipo) + 2(origem) + 3(destino) + 4(confirmação) = 4 steps
    // CUSTOMER DELIVERY: 1(tipo) + 2(origem) + 3(destino) + 4(detalhes) + 5(confirmação) = 5 steps
    if (skipTypeSelection) {
      return 4; // CLIENT: sempre DELIVERY sem step de tipo
    }
    return wizardData.deliveryType === 'RIDE' ? 4 : 5;
  };

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  };

  // Calcula o último step interno
  const getMaxStep = (): number => {
    // CLIENT sempre vai até o step 5 (DELIVERY sem step 1)
    // CUSTOMER DELIVERY: step 5
    // CUSTOMER RIDE: step 4
    if (skipTypeSelection) {
      return 5; // CLIENT: 2→3→4→5
    }
    return wizardData.deliveryType === 'RIDE' ? 4 : 5;
  };

  // Calcula o frete quando entra no último step
  const calculateFreight = async () => {
    const { fromLatitude, fromLongitude, toLatitude, toLongitude, fromAddress, toAddress } = wizardData;
    
    if (!fromLatitude || !fromLongitude || !toLatitude || !toLongitude) {
      console.warn('⚠️ [Wizard] Coordenadas incompletas para calcular frete');
      return;
    }
    
    setWizardData(prev => ({ ...prev, freightLoading: true, freightError: null }));
    
    try {
      const result = await freightService.simulateFreight(
        fromLatitude, fromLongitude,
        toLatitude, toLongitude,
        fromAddress, toAddress,
      );
      
      setWizardData(prev => ({
        ...prev,
        freightSimulation: result,
        freightLoading: false,
        distanceKm: result.distanceKm,
        routePolyline: result.encodedPolyline || null,
      }));
      
      console.log(`✅ [Wizard] Frete calculado: R$ ${result.totalShippingFee.toFixed(2)} (${result.distanceKm} km)`);
    } catch (error: any) {
      console.error('❌ [Wizard] Erro ao calcular frete:', error);
      setWizardData(prev => ({
        ...prev,
        freightLoading: false,
        freightError: 'Não foi possível calcular o frete. Tente novamente.',
      }));
    }
  };

  const handleNext = () => {
    const maxStep = getMaxStep();
    if (currentStep < maxStep) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // Se está entrando no último step, calcula o frete
      if (nextStep === maxStep) {
        setTimeout(() => calculateFreight(), 100);
      }
    }
  };

  const handleBack = () => {
    // NÃO limpa os dados ao voltar - preserva o estado para permitir navegação
    // Os dados só devem ser limpos quando o wizard é fechado ou resetado
    
    // Para CLIENT, o step mínimo é 2 (não tem step 1)
    const minStep = skipTypeSelection ? 2 : 1;
    if (currentStep > minStep) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onClose();
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1: // Tipo selecionado
        return true; // Sempre válido (tem default)
      
      case 2: // Origem
        return wizardData.fromAddress.trim().length > 0 && wizardData.fromAddressConfirmed;
      
      case 3: // Destino
        return wizardData.toAddress.trim().length > 0 && wizardData.toAddressConfirmed;
      
      case 4: // Detalhes (só para DELIVERY) ou Confirmação (RIDE)
        if (wizardData.deliveryType === 'DELIVERY') {
          return (
            wizardData.itemDescription.trim().length > 0 &&
            wizardData.recipientName.trim().length > 0 &&
            wizardData.recipientPhone.trim().length > 0
          );
        }
        // RIDE: último step é a confirmação - precisa do frete calculado
        return wizardData.freightSimulation !== null && !wizardData.freightLoading;
      
      case 5: // Confirmação (só DELIVERY)
        return wizardData.freightSimulation !== null && !wizardData.freightLoading;
      
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    const isClient = userRole?.toUpperCase() === 'CLIENT';
    
    // CUSTOMER RIDE: aceita PIX (no aceite) ou Cartão (no trânsito)
    // Apenas valida se tem cartão quando cartão for escolhido
    if (wizardData.deliveryType === 'RIDE') {
      try {
        const preference = await paymentService.getPaymentPreference();
        
        // Se escolheu CARTÃO, valida se tem cartão cadastrado
        if (preference.preferredPaymentType === 'CREDIT_CARD') {
          if (!preference.defaultCardId) {
            const hasCards = await paymentService.hasCards();
            if (!hasCards) {
              Alert.alert(
                '⚠️ Cartão Necessário',
                'Você precisa cadastrar um cartão para criar viagens (RIDE) com pagamento por cartão.',
                [{ text: 'OK' }]
              );
              return;
            }
          }
          console.log('🚗💳 CUSTOMER RIDE + CARTÃO: Pagamento será processado quando courier entrar em trânsito');
        }
        
        // PIX é aceito para RIDE - será cobrado no aceite
        if (preference.preferredPaymentType === 'PIX') {
          console.log('🚗💰 CUSTOMER RIDE + PIX: QR Code será enviado quando courier aceitar a viagem');
        }
      } catch (error) {
        console.error('Erro ao validar preferência:', error);
        Alert.alert('Erro', 'Não foi possível validar sua preferência de pagamento.');
        return;
      }
    }

    // Validação para CLIENT (estabelecimento) criando DELIVERY
    if (isClient && wizardData.deliveryType === 'DELIVERY') {
      try {
        const preference = await paymentService.getPaymentPreference();
        
        // CLIENT com CARTÃO: valida se tem cartão cadastrado
        if (preference.preferredPaymentType === 'CREDIT_CARD') {
          if (!preference.defaultCardId) {
            const hasCards = await paymentService.hasCards();
            if (!hasCards) {
              Alert.alert(
                '⚠️ Cartão Necessário',
                'Configure um cartão de crédito para pagamento automático no aceite da entrega.',
                [{ text: 'OK' }]
              );
              return;
            }
          }
          // Informa que será cobrado no aceite
          console.log('💳 CLIENT + CARTÃO: Pagamento será processado quando o courier aceitar a entrega');
        }
        
        // CLIENT com PIX: informa sobre pagamento consolidado
        if (preference.preferredPaymentType === 'PIX') {
          console.log('💰 CLIENT + PIX: Pagamento será consolidado pelo administrador');
          // PIX de CLIENT é consolidado - não gera QR Code automático
        }
      } catch (error) {
        console.error('Erro ao validar preferência para CLIENT:', error);
        Alert.alert('Erro', 'Não foi possível validar sua preferência de pagamento.');
        return;
      }
    }

    // Validação para CUSTOMER criando DELIVERY
    if (!isClient && wizardData.deliveryType === 'DELIVERY') {
      try {
        const preference = await paymentService.getPaymentPreference();
        
        // CUSTOMER DELIVERY com CARTÃO: valida cartão e informa que será cobrado no trânsito
        if (preference.preferredPaymentType === 'CREDIT_CARD') {
          if (!preference.defaultCardId) {
            const hasCards = await paymentService.hasCards();
            if (!hasCards) {
              Alert.alert(
                '⚠️ Cartão Necessário',
                'Configure um cartão para pagamento automático quando o courier iniciar o trânsito.',
                [{ text: 'OK' }]
              );
              return;
            }
          }
          console.log('📦💳 CUSTOMER DELIVERY + CARTÃO: Pagamento será processado quando o courier entrar em trânsito (confirmPickup)');
        }
        
        // CUSTOMER DELIVERY com PIX: informa que receberá QR Code no aceite
        if (preference.preferredPaymentType === 'PIX') {
          console.log('📦💰 CUSTOMER DELIVERY + PIX: QR Code será enviado quando o courier aceitar a entrega');
        }
      } catch (error) {
        console.error('Erro ao validar preferência para CUSTOMER:', error);
        Alert.alert('Erro', 'Não foi possível validar sua preferência de pagamento.');
        return;
      }
    }

    setLoading(true);
    try {
      const user = await authService.getCurrentUser();
      
      if (!user || !user.id) {
        Alert.alert('Erro', 'Usuário não autenticado');
        setLoading(false);
        return;
      }

      const itemVal = wizardData.deliveryType === 'DELIVERY' && wizardData.itemValue.trim()
        ? parseFloat(wizardData.itemValue.replace(',', '.'))
        : null;

      const deliveryData = {
        status: 'PENDING',
        payments: [],
        client: user.id,
        deliveryType: wizardData.deliveryType,
        fromAddress: wizardData.fromAddress.trim(),
        fromLatitude: wizardData.fromLatitude,
        fromLongitude: wizardData.fromLongitude,
        toAddress: wizardData.toAddress.trim(),
        toLatitude: wizardData.toLatitude,
        toLongitude: wizardData.toLongitude,
        totalAmount: itemVal !== null ? itemVal.toFixed(2) : '0', // valor a cobrar na entrega (COD)
        shippingFee: wizardData.freightSimulation?.totalShippingFee ?? 0, // frete calculado
        distanceKm: wizardData.distanceKm,
        // Campos específicos de DELIVERY
        itemDescription: wizardData.deliveryType === 'DELIVERY' ? wizardData.itemDescription.trim() : 'Passageiro',
        recipientName: wizardData.deliveryType === 'DELIVERY' ? wizardData.recipientName.trim() : user.name,
        recipientPhone: wizardData.deliveryType === 'DELIVERY' ? wizardData.recipientPhone.trim() : '',
      };

      console.log('📦 Criando nova entrega/viagem:', deliveryData);
      
      const result = await deliveryService.createDelivery(deliveryData);

      if (result.success) {
        const typeLabel = wizardData.deliveryType === 'RIDE' ? 'Viagem' : 'Entrega';
        Alert.alert(
          '✅ Sucesso',
          `${typeLabel} criada com sucesso! ${
            wizardData.deliveryType === 'RIDE' ? 'Um motorista' : 'Um motoboy'
          } em breve irá aceitar sua solicitação.`,
          [{ text: 'OK', onPress: onClose }]
        );
        if (onSuccess && result.data) {
          onSuccess(result.data);
        }
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível criar a solicitação');
      }
    } catch (error: any) {
      console.error('❌ Erro ao criar:', error);
      Alert.alert('Erro', 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    const totalSteps = getTotalSteps();

    // Step 1: Escolher tipo
    if (currentStep === 1) {
      return (
        <StepTypeSelector
          selectedType={wizardData.deliveryType}
          onSelectType={(type) => updateWizardData({ deliveryType: type })}
        />
      );
    }

    // Step 2: Endereço de origem
    if (currentStep === 2) {
      return (
        <StepOriginAddress
          address={wizardData.fromAddress}
          latitude={wizardData.fromLatitude}
          longitude={wizardData.fromLongitude}
          initialMapCenter={initialMapCenter}
          deliveryType={wizardData.deliveryType}
          isConfirmed={wizardData.fromAddressConfirmed}
          onUpdate={(data: Partial<WizardData>) => updateWizardData(data)}
          onConfirmAndAdvance={handleNext}
        />
      );
    }

    // Step 3: Endereço de destino
    if (currentStep === 3) {
      return (
        <StepDestinationAddress
          address={wizardData.toAddress}
          latitude={wizardData.toLatitude}
          longitude={wizardData.toLongitude}
          initialMapCenter={initialMapCenter}
          deliveryType={wizardData.deliveryType}
          isConfirmed={wizardData.toAddressConfirmed}
          onUpdate={(data: Partial<WizardData>) => updateWizardData(data)}
          onConfirmAndAdvance={handleNext}
        />
      );
    }

    // Step 4: Detalhes da entrega (só DELIVERY) ou Confirmação (RIDE)
    if (currentStep === 4) {
      if (wizardData.deliveryType === 'DELIVERY') {
        return (
          <StepDeliveryDetails
            itemDescription={wizardData.itemDescription}
            recipientName={wizardData.recipientName}
            recipientPhone={wizardData.recipientPhone}
            itemValue={wizardData.itemValue}
            onUpdate={(data: Partial<WizardData>) => updateWizardData(data)}
          />
        );
      } else {
        // RIDE: já mostra confirmação
        return (
          <StepConfirmation
            wizardData={wizardData}
            onUpdateAmount={(amount: string) => updateWizardData({ totalAmount: amount })}
            onRetryFreight={calculateFreight}
          />
        );
      }
    }

    // Step 5: Confirmação (só DELIVERY)
    if (currentStep === 5) {
      return (
        <StepConfirmation
          wizardData={wizardData}
          onUpdateAmount={(amount: string) => updateWizardData({ totalAmount: amount })}
          onRetryFreight={calculateFreight}
        />
      );
    }

    return null;
  };

  const totalSteps = getTotalSteps();
  const maxStep = getMaxStep();
  const isLastStep = currentStep === maxStep;
  const canProceed = validateCurrentStep();
  
  // Para exibição: CLIENT começa no step 2 internamente, mas mostra como step 1
  const displayStep = skipTypeSelection ? currentStep - 1 : currentStep;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleBack}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {wizardData.deliveryType === 'RIDE' ? '🚗 Nova Viagem' : '📦 Nova Entrega'}
          </Text>
          <View style={styles.backButton} />
        </View>

        {/* Progress Indicator com botões nos cantos */}
        <View style={styles.progressRow}>
          {/* Botão Voltar - lado esquerdo */}
          {!isKeyboardVisible && (
            <TouchableOpacity
              style={styles.inlineNavButton}
              onPress={handleBack}
            >
              <Ionicons name="chevron-back" size={18} color="#fff" />
              <Text style={styles.inlineNavButtonText}>Voltar</Text>
            </TouchableOpacity>
          )}
          {isKeyboardVisible && <View style={styles.inlineNavButtonPlaceholder} />}

          {/* Progress Dots - centro */}
          <View style={styles.progressCenter}>
            <View style={styles.progressContainer}>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index + 1 <= displayStep && styles.progressDotActive,
                    index + 1 === displayStep && styles.progressDotCurrent,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.progressText}>
              Etapa {displayStep} de {totalSteps}
            </Text>
          </View>

          {/* Botão Avançar/Confirmar - lado direito */}
          {!isKeyboardVisible && (
            <TouchableOpacity
              style={[
                styles.inlineNavButton,
                styles.inlineNavButtonPrimary,
                (!canProceed || loading) && styles.inlineNavButtonDisabled,
              ]}
              onPress={isLastStep ? handleSubmit : handleNext}
              disabled={!canProceed || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.inlineNavButtonTextPrimary}>
                    {isLastStep ? 'Confirmar' : 'Avançar'}
                  </Text>
                  <Ionicons
                    name={isLastStep ? 'checkmark-circle' : 'chevron-forward'}
                    size={18}
                    color="#fff"
                  />
                </>
              )}
            </TouchableOpacity>
          )}
          {isKeyboardVisible && <View style={styles.inlineNavButtonPlaceholder} />}
        </View>

        {/* Step Content */}
        <View style={styles.content}>{renderStep()}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  progressCenter: {
    flex: 1,
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  progressDotActive: {
    backgroundColor: '#10b981',
  },
  progressDotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  progressText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  inlineNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    backgroundColor: '#334155',
    minWidth: 90,
  },
  inlineNavButtonPrimary: {
    backgroundColor: '#10b981',
  },
  inlineNavButtonDisabled: {
    opacity: 0.5,
  },
  inlineNavButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  inlineNavButtonTextPrimary: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  inlineNavButtonPlaceholder: {
    minWidth: 90,
  },
});
