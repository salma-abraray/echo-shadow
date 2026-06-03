/**
 * ScrollArrow
 * Animated bouncing ↓ arrow — identical to ProfileScreen's SwipeHint.
 * Shows on every page that requires a swipe-down to advance.
 *
 * Props:
 *   onPress  — called when the user taps the arrow (e.g. scroll to next page)
 *   style    — optional outer View style overrides
 */
import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function ScrollArrow({ onPress, style }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue:        7,
          duration:       600,
          easing:         Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(bounce, {
          toValue:        0,
          duration:       600,
          easing:         Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.delay(300),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={[styles.wrap, style]}
    >
      <Animated.View style={{ transform: [{ translateY: bounce }] }}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 5v14M5 13l7 7 7-7"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems:    'center',
    paddingBottom: 6,
    paddingTop:    8,
  },
});
