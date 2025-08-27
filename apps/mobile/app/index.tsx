import { Stack } from 'expo-router';
import { HomeScreen } from '../src/screens/HomeScreen';

export default function App() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'PDF to Markdown',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
