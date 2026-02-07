import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StepDeliveryDetailsProps {
  itemDescription: string;
  recipientName: string;
  recipientPhone: string;
  itemValue: string;
  onUpdate: (data: {
    itemDescription: string;
    recipientName: string;
    recipientPhone: string;
    itemValue: string;
  }) => void;
}

export default function StepDeliveryDetails({
  itemDescription,
  recipientName,
  recipientPhone,
  itemValue,
  onUpdate,
}: StepDeliveryDetailsProps) {
  const [localDescription, setLocalDescription] = useState(itemDescription);
  const [localName, setLocalName] = useState(recipientName);
  const [localPhone, setLocalPhone] = useState(recipientPhone);
  const [localItemValue, setLocalItemValue] = useState(itemValue);

  useEffect(() => {
    setLocalDescription(itemDescription);
    setLocalName(recipientName);
    setLocalPhone(recipientPhone);
    setLocalItemValue(itemValue);
  }, [itemDescription, recipientName, recipientPhone, itemValue]);

  const emitUpdate = (overrides: Partial<{
    itemDescription: string;
    recipientName: string;
    recipientPhone: string;
    itemValue: string;
  }>) => {
    onUpdate({
      itemDescription: overrides.itemDescription ?? localDescription,
      recipientName: overrides.recipientName ?? localName,
      recipientPhone: overrides.recipientPhone ?? localPhone,
      itemValue: overrides.itemValue ?? localItemValue,
    });
  };

  const handleDescriptionChange = (text: string) => {
    setLocalDescription(text);
    emitUpdate({ itemDescription: text });
  };

  const handleNameChange = (text: string) => {
    setLocalName(text);
    emitUpdate({ recipientName: text });
  };

  const maskPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (text: string) => {
    const masked = maskPhone(text);
    setLocalPhone(masked);
    emitUpdate({ recipientPhone: masked });
  };

  const maskCurrency = (value: string): string => {
    // Remove tudo que não é dígito
    let digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    // Converte para centavos
    const cents = parseInt(digits, 10);
    const reais = (cents / 100).toFixed(2);
    // Formata com separador de milhar e vírgula decimal
    const [intPart, decPart] = reais.split('.');
    const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${intFormatted},${decPart}`;
  };

  const handleItemValueChange = (text: string) => {
    const masked = maskCurrency(text);
    setLocalItemValue(masked);
    emitUpdate({ itemValue: masked });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>📦 Detalhes da Entrega</Text>
      <Text style={styles.subtitle}>
        Informe o que será entregue e quem irá receber
      </Text>

      {/* Descrição do item */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>O que será entregue?</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descrição do Item *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ex: Caixa com documentos, Encomenda pequena, Alimentos..."
            placeholderTextColor="#64748b"
            value={localDescription}
            onChangeText={handleDescriptionChange}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.hint}>
            Seja específico para ajudar o motoboy a identificar o item
          </Text>
        </View>
      </View>

      {/* Dados do destinatário */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quem vai receber?</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome Completo do Destinatário *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: João da Silva"
            placeholderTextColor="#64748b"
            value={localName}
            onChangeText={handleNameChange}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telefone do Destinatário *</Text>
          <TextInput
            style={styles.input}
            placeholder="(85) 99999-9999"
            placeholderTextColor="#64748b"
            value={localPhone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={15}
          />
          <Text style={styles.hint}>
            Para contato em caso de dúvidas na entrega
          </Text>
        </View>
      </View>

      {/* Valor a cobrar na entrega */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Valor a cobrar na entrega</Text>
        
        <View style={styles.codInfoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.codInfoText}>
            Se o destinatário precisa pagar algum valor ao receber o item, informe aqui. Este valor <Text style={styles.codBold}>NÃO é o frete</Text> — é o valor do produto/serviço que o motoboy vai cobrar do destinatário no ato da entrega.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Valor a cobrar (opcional)</Text>
          <View style={styles.currencyInputContainer}>
            <Text style={styles.currencyPrefix}>R$</Text>
            <TextInput
              style={styles.currencyInput}
              placeholder="0,00"
              placeholderTextColor="#64748b"
              value={localItemValue}
              onChangeText={handleItemValueChange}
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.hint}>
            Deixe em branco caso não haja valor a ser cobrado do destinatário
          </Text>
        </View>
      </View>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Ionicons name="shield-checkmark-outline" size={24} color="#10b981" />
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>Seus dados estão seguros</Text>
          <Text style={styles.infoText}>
            Estas informações serão compartilhadas apenas com o motoboy responsável pela entrega.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontStyle: 'italic',
  },
  codInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#172554',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e40af',
  },
  codInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#93c5fd',
    lineHeight: 19,
  },
  codBold: {
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
    paddingLeft: 16,
    paddingRight: 4,
  },
  currencyInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1e3a2f',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6ee7b7',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#a7f3d0',
    lineHeight: 18,
  },
});
