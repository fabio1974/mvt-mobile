import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: 'location',
    iconColor: '#3b82f6',
    title: 'Viagens e Entregas',
    description: 'Solicite viagens de passageiros ou entregas de forma rápida e segura, diretamente pelo app.',
  },
  {
    icon: 'car',
    iconColor: '#10b981',
    title: 'Motoristas e Motoboys',
    description: 'Conectamos você com motoristas e motoboys profissionais da sua região.',
  },
  {
    icon: 'people-circle',
    iconColor: '#8b5cf6',
    title: 'Grupos e Comissões',
    description: 'Líderes de Associação: crie grupos de motoristas e estabelecimentos. Ganhe 5% de comissão em cada viagem/entrega solicitada pelos seus estabelecimentos!',
  },
  {
    icon: 'card',
    iconColor: '#f59e0b',
    title: 'Pagamento Seguro',
    description: 'Pague com cartão de crédito de forma totalmente segura. Também aceitamos PIX. Suas transações sempre protegidas.',
  },
  {
    icon: 'checkmark-circle',
    iconColor: '#10b981',
    title: 'Pronto para Começar?',
    description: 'Seja cliente, estabelecimento, motorista ou líder de associação. Temos um lugar para você!',
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const scrollToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: width * (currentIndex + 1),
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: width * index,
      animated: true,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip Button */}
      {currentIndex < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
          <Text style={styles.skipButtonText}>Pular</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.slideContent}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: `${slide.iconColor}20` }]}>
                <Ionicons name={slide.icon} size={80} color={slide.iconColor} />
              </View>

              {/* Title */}
              <Text style={styles.title}>{slide.title}</Text>

              {/* Description */}
              <Text style={styles.description}>{slide.description}</Text>

              {/* Special content for Groups slide */}
              {index === 2 && (
                <View style={styles.groupsPreview}>
                  <View style={styles.groupCard}>
                    <Ionicons name="car-sport" size={24} color="#10b981" />
                    <Text style={styles.groupCardText}>Motoristas</Text>
                  </View>
                  <View style={styles.groupCard}>
                    <Ionicons name="storefront" size={24} color="#f59e0b" />
                    <Text style={styles.groupCardText}>Estabelecimentos</Text>
                  </View>
                  <View style={styles.commissionBadge}>
                    <Ionicons name="cash" size={20} color="#10b981" />
                    <Text style={styles.commissionText}>5% por viagem</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomContainer}>
        {/* Dots Indicator */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToIndex(index)}
              style={[
                styles.dot,
                currentIndex === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next/Start Button */}
        <TouchableOpacity style={styles.nextButton} onPress={scrollToNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === SLIDES.length - 1 ? 'Começar' : 'Próximo'}
          </Text>
          <Ionicons
            name={currentIndex === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={20}
            color="#ffffff"
            style={styles.nextButtonIcon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 12,
  },
  skipButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bottomContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#6366f1',
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  nextButtonIcon: {
    marginLeft: 8,
  },
  groupsPreview: {
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    width: '80%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  groupCardText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  commissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98120',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  commissionText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
