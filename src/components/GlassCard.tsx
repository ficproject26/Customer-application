import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useThemeStore } from '../store/themeStore';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
  backgroundColor?: string;
}

function GlassCard({ children, style, borderColor, backgroundColor }: GlassCardProps) {
  const colors = useThemeStore((state) => state.colors);

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: backgroundColor || colors.cardBg,
        borderColor: borderColor || colors.cardBorder,
      },
      style
    ]}>
      {children}
    </View>
  );
}

export default React.memo(GlassCard);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  }
});
