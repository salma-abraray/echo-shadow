import React from 'react';
import { View, Text } from 'react-native';

/**
 * WANDER / LOST logo.
 *
 * Props:
 *   color    – '#fff' (dark bg) or '#111' (light bg)
 *   fontSize – point size of each line (default 20 for header, ~80 for splash)
 */
export default function AppLogo({ color = '#fff', fontSize = 20 }) {
  const lh = Math.round(fontSize * 1.06);

  const lineStyle = {
    color,
    fontSize,
    lineHeight: lh,
    fontWeight: '900',
    letterSpacing: fontSize > 40 ? -2 : -0.5,
  };

  return (
    // alignItems:'flex-start' lets the two lines be left-aligned;
    // 'alignSelf':'flex-end' on LOST pushes it to the right of the block →
    // creates the staggered indent from the reference image.
    <View style={{ alignItems: 'flex-start' }}>
      <Text style={lineStyle}>WANDER</Text>
      <Text style={[lineStyle, { alignSelf: 'flex-end' }]}>LOST</Text>
    </View>
  );
}
