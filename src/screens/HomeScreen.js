import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { FONTS } from '../theme';

const { height } = Dimensions.get('window');

export default function HomeScreen({ onStart }) {
  const fadeTitle = useRef(new Animated.Value(0)).current;
  const fadeSubtitle = useRef(new Animated.Value(0)).current;
  const fadeButton = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeTitle, { toValue: 1, duration: 700, useNativeDriver: false }),
      Animated.parallel([
        Animated.timing(fadeSubtitle, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]),
      Animated.delay(200),
      Animated.timing(fadeButton, { toValue: 1, duration: 500, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.Text style={[styles.title, { opacity: fadeTitle }]}>
          WanderLost
        </Animated.Text>
        <Animated.Text
          style={[
            styles.subtitle,
            { opacity: fadeSubtitle, transform: [{ translateY: slideUp }] },
          ]}
        >
          Let's explore together
        </Animated.Text>
      </View>

      <Animated.View style={[styles.buttonWrapper, { opacity: fadeButton }]}>
        <TouchableOpacity style={styles.button} onPress={onStart} activeOpacity={0.8}>
          <Text style={styles.buttonText}>START</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: height * 0.22,
    paddingBottom: 60,
  },
  content: {
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 44,
    fontWeight: '300',
    color: '#111',
    letterSpacing: 4,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: '#888',
    letterSpacing: 1,
    fontWeight: '300',
  },
  buttonWrapper: {
    width: '80%',
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FONTS.title,
    color: '#fff',
    fontSize: 15,
    letterSpacing: 3,
    fontWeight: '500',
  },
});
