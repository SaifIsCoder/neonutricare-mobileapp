import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

// Signed-in area. The tab bar lives in (tabs); everything declared here pushes
// over it with a back button.
export default function AppLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="result" options={{ title: 'Result', headerBackVisible: false }} />
      <Stack.Screen name="record/[id]" options={{ title: 'Assessment' }} />
      <Stack.Screen name="maternal" options={{ title: 'Maternal support' }} />
      <Stack.Screen name="assistant" options={{ title: 'AI assistant' }} />
    </Stack>
  );
}
