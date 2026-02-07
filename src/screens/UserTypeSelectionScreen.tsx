import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UserRole = 'CUSTOMER' | 'ESTABLISHMENT' | 'COURIER' | 'MANAGER';

interface UserTypeOption {
  role: UserRole;
  icon: string;
  title: string;
  description: string;
}

interface UserTypeSelectionScreenProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (role: UserRole) => void;
}

const USER_TYPES: UserTypeOption[] = [
  {
    role: 'CUSTOMER',
    icon: 'person',
    title: 'Cliente Pessoa Física',
    description: 'Quero solicitar viagens ou entregas para uso pessoal',
  },
  {
    role: 'ESTABLISHMENT',
    icon: 'storefront',
    title: 'Estabelecimento Comercial',
    description: 'Tenho um negócio e preciso de entregas para meus clientes',
  },
  {
    role: 'COURIER',
    icon: 'car',
    title: 'Motoboy ou Motorista de Automóvel',
    description: 'Quero trabalhar fazendo entregas e viagens de passageiros',
  },
  {
    role: 'MANAGER',
    icon: 'people',
    title: 'Líder de Associação',
    description: 'Represento uma associação de motoboys ou motoristas',
  },
];

export default function UserTypeSelectionScreen({
  visible,
  onClose,
  onSelectType,
}: UserTypeSelectionScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      onSelectType(selectedRole);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#1e293b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Title */}
          <Text style={styles.title}>Qual é o seu perfil?</Text>
          <Text style={styles.subtitle}>
            Selecione a opção que melhor descreve você:
          </Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {USER_TYPES.map((type) => (
              <TouchableOpacity
                key={type.role}
                style={[
                  styles.optionCard,
                  selectedRole === type.role && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedRole(type.role)}
              >
                <View style={styles.optionIcon}>
                  <Ionicons
                    name={type.icon as any}
                    size={36}
                    color={selectedRole === type.role ? '#3b82f6' : '#64748b'}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text
                    style={[
                      styles.optionTitle,
                      selectedRole === type.role && styles.optionTitleSelected,
                    ]}
                  >
                    {type.title}
                  </Text>
                  <Text style={styles.optionDescription}>{type.description}</Text>
                </View>
                {selectedRole === type.role && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={28} color="#3b82f6" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.continueButton, !selectedRole && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!selectedRole}
          >
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 16,
  },
  optionCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: '#3b82f6',
  },
  optionDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  checkmark: {
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
