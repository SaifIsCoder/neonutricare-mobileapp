import Ionicons from '@expo/vector-icons/Ionicons';

import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';


const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  // `.splash` in the mockup: a translucent rounded tile over the wordmark and
  // tagline, on a teal gradient.
  const image = (
    <View style={styles.brandLockup}>
      <View style={styles.brandTile}>
        <Ionicons name="fitness" size={34} color="#FFFFFF" />
      </View>
      <Text style={styles.brandName}>NeoNutriCare</Text>
      <Text style={styles.brandTagline}>
        AI-powered newborn malnutrition risk prediction & maternal support
      </Text>
    </View>
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {image}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {image}
    </View>
  );
}



const styles = StyleSheet.create({

  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.light.primary,
    experimental_backgroundImage: `linear-gradient(160deg, ${Colors.light.primary}, ${Colors.light.primaryDark})`,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  brandLockup: {
    alignItems: 'center',
    gap: Spacing.two + 6,
    paddingHorizontal: Spacing.four,
  },
  brandTile: {
    width: 80,
    height: 80,
    borderRadius: Radius.xxl + 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: Fonts.displayHeavy,
    fontSize: 26,
    lineHeight: 32,
    color: '#FFFFFF',
  },
  brandTagline: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 240,
    color: 'rgba(255,255,255,0.85)',
  },
});
