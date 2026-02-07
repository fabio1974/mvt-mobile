import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeliveryType } from '../../../types/payment';

interface StepTypeSelectorProps {
  selectedType: DeliveryType;
  onSelectType: (type: DeliveryType) => void;
}

export default function StepTypeSelector({ selectedType, onSelectType }: StepTypeSelectorProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>O que você precisa?</Text>
      <Text style={styles.subtitle}>Escolha o tipo de serviço desejado</Text>

      <View style={styles.optionsContainer}>
        {/* Opção: Entrega */}
        <TouchableOpacity
          style={[styles.optionCard, selectedType === 'DELIVERY' && styles.optionCardSelected]}
          onPress={() => onSelectType('DELIVERY')}
        >
          <View style={styles.optionIcon}>
            <Ionicons
              name="cube"
              size={48}
              color={selectedType === 'DELIVERY' ? '#10b981' : '#94a3b8'}
            />
          </View>
          <Text style={[styles.optionTitle, selectedType === 'DELIVERY' && styles.optionTitleSelected]}>
            📦 Entrega
          </Text>
          <Text style={styles.optionDescription}>
            Enviar documentos, encomendas ou objetos para alguém
          </Text>
          <View style={styles.optionFeatures}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.featureText}>Motoboy coleta e entrega</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.featureText}>Rastreamento em tempo real</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="cash" size={16} color="#3b82f6" />
              <Text style={styles.featureText}>Pago quando motoboy aceita</Text>
            </View>
          </View>
          {selectedType === 'DELIVERY' && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.selectedBadgeText}>Selecionado</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Opção: Viagem */}
        <TouchableOpacity
          style={[styles.optionCard, selectedType === 'RIDE' && styles.optionCardSelected]}
          onPress={() => onSelectType('RIDE')}
        >
          <View style={styles.optionIcon}>
            <Ionicons
              name="car"
              size={48}
              color={selectedType === 'RIDE' ? '#10b981' : '#94a3b8'}
            />
          </View>
          <Text style={[styles.optionTitle, selectedType === 'RIDE' && styles.optionTitleSelected]}>
            🚗 Viagem
          </Text>
          <Text style={styles.optionDescription}>
            Transporte pessoal de um local para outro (como passageiro)
          </Text>
          <View style={styles.optionFeatures}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.featureText}>Motorista particular</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.featureText}>Rastreamento da rota</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="card" size={16} color="#8b5cf6" />
              <Text style={styles.featureText}>Pago quando motorista inicia</Text>
            </View>
          </View>
          {selectedType === 'RIDE' && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.selectedBadgeText}>Selecionado</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Info box sobre pagamento */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>Sobre o pagamento</Text>
          <Text style={styles.infoText}>
            O pagamento é automático usando sua preferência configurada (PIX ou Cartão).
            Configure em "Preferências de Pagamento" no menu.
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
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#334155',
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#1e3a2f',
  },
  optionIcon: {
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
  },
  optionTitleSelected: {
    color: '#fff',
  },
  optionDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#bfdbfe',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#93c5fd',
    lineHeight: 18,
  },
});
