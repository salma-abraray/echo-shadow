import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// WanderLost logo — white text on transparent background
// Original: 4167 × 1680 px  →  display at 90 × 36 (aspect preserved)
const LOGO_SRC = require('../../assets/images/logo_white.png');
const LOGO_W   = 90;
const LOGO_H   = Math.round(LOGO_W * (1680 / 4167)); // ≈ 36

export default function LogoHeader({ style }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        { top: Math.max(44, insets.top + 8) },
        style,
      ]}
      pointerEvents="none"
    >
      <Image
        source={LOGO_SRC}
        style={styles.logo}
        resizeMode="contain"
        fadeDuration={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left:     24,
    zIndex:   100,
  },
  logo: {
    width:  LOGO_W,
    height: LOGO_H,
  },
});
