import { Stack } from 'expo-router';

// Signed-in area. The tab bar lives in (tabs); everything declared here pushes
// over it.
//
// Native headers stay hidden: the mockup gives every pushed screen its own
// `.topbar` (back `.iconbtn` + Manrope title), which `<Screen>` renders. The
// titles below are kept because they still name the route for the OS.
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="result" options={{ title: 'Result', gestureEnabled: false }} />
      <Stack.Screen name="record/[id]" options={{ title: 'Assessment' }} />
      <Stack.Screen name="maternal" options={{ title: 'Maternal support' }} />
      <Stack.Screen name="assistant" options={{ title: 'AI assistant' }} />
    </Stack>
  );
}
