// Per-weight entry points: the package root would bundle all 18 Overpass faces.
import { Overpass_400Regular } from '@expo-google-fonts/overpass/400Regular';
import { Overpass_600SemiBold } from '@expo-google-fonts/overpass/600SemiBold';
import { Overpass_800ExtraBold } from '@expo-google-fonts/overpass/800ExtraBold';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TodoScreen } from './src/screens/TodoScreen';
import { colors, fonts } from './src/theme';

// Keep the splash up until the fonts are ready, so text never flashes in the system font.
void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: Overpass_400Regular,
    [fonts.semibold]: Overpass_600SemiBold,
    [fonts.extrabold]: Overpass_800ExtraBold,
  });

  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontError !== null) console.warn('Failed to load fonts', fontError);
  }, [fontError]);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // A font failure falls back to the system font rather than blocking the app.
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <TodoScreen />
          <StatusBar style="dark" />
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
