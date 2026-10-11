import { Image, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';
import { Button, Screen } from '../components/ui';

const FEATURES = ['Find nearby farm jobs', 'Connect with workers', 'Live map with distance', 'Safe & reliable'];

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <View style={{ paddingTop: insets.top + 20, alignItems: 'center' }}>
        <Image source={require('../assets/agrijoin-logo.webp')} style={{ width: 220, height: 200, resizeMode: 'contain' }} />
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 8, textAlign: 'center' }}>
          Connecting Farmers.{'\n'}Empowering Labourers.
        </Text>
        <Text style={{ color: colors.green, fontWeight: '800', fontSize: 20, marginTop: 2 }}>Growing Together.</Text>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 12, paddingHorizontal: 10 }}>
          An early-stage platform to make agricultural labour coordination simpler and fairer.
        </Text>

        <View style={{ marginTop: 20, width: '100%' }}>
          {FEATURES.map((f) => (
            <View
              key={f}
              style={{ backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 }}
            >
              <Text style={{ color: colors.text }}>• {f}</Text>
            </View>
          ))}
        </View>

        <View style={{ width: '100%', marginTop: 20, gap: 10 }}>
          <Button title="Create Account" onPress={() => router.push('/sign-up')} />
          <Button title="Sign In" variant="ghost" onPress={() => router.push('/sign-in')} />
        </View>
      </View>
    </Screen>
  );
}
