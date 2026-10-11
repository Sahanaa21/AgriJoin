import { Tabs } from 'expo-router';
import { Home, Search, Map, ClipboardList, MessageSquare, User } from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

export default function TabsLayout() {
  const { role } = useAuth();
  const isFarmer = role === 'farmer';

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11 },
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen
        name="jobs"
        options={{ title: isFarmer ? 'My Jobs' : 'Browse', tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }}
      />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: ({ color, size }) => <Map color={color} size={size} /> }} />
      <Tabs.Screen
        name="applications"
        options={{ title: 'Applied', tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} /> }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
