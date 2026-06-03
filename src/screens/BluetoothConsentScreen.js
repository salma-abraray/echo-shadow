import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { FONTS } from '../theme';

export default function BluetoothConsentScreen({ onAccept }) {
  const [showError, setShowError] = useState(false);
  const fadeModal = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeModal, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, []);

  const handleDecline = () => {
    setShowError(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: false }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: false }),
    ]).start();
  };

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.modal,
          { opacity: fadeModal, transform: [{ translateX: shakeAnim }] },
        ]}
      >
        <View style={styles.iconRow}>
          <Text style={styles.bluetoothIcon}>⬡</Text>
        </View>

        <Text style={styles.title}>Bluetooth Required</Text>
        <Text style={styles.body}>
          WanderLost uses Bluetooth to guide you through nearby artworks and
          create a personalised experience during your visit.
        </Text>

        {showError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Bluetooth is required for WanderLost to work. Please enable it to
              continue your visit.
            </Text>
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDecline}
            activeOpacity={0.7}
          >
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={onAccept}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
  },
  iconRow: {
    marginBottom: 16,
  },
  bluetoothIcon: {
    fontSize: 40,
    color: '#1E90FF',
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#E53935',
  },
  errorText: {
    fontFamily: FONTS.body,
    color: '#C62828',
    fontSize: 13,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  declineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
  },
  declineText: {
    fontFamily: FONTS.title,
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptText: {
    fontFamily: FONTS.title,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
