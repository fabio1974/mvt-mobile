import React from 'react';
import { Text, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface GradientTextProps {
  children: string;
  style?: TextStyle | TextStyle[];
  colors?: readonly [string, string, ...string[]];
}

export default function GradientText({ 
  children, 
  style,
  colors = ['#1e3a8a', '#3b82f6', '#60a5fa'] as const // Azul escuro -> Azul médio -> Azul claro
}: GradientTextProps) {
  return (
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: 'transparent' }]}>
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[style, { opacity: 0 }]}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
