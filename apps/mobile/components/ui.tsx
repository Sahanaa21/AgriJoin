import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, radius } from '../lib/theme';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}) {
  const bg = variant === 'primary' ? colors.green : variant === 'accent' ? colors.accent : colors.white;
  const fg = variant === 'ghost' ? colors.text : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderWidth: variant === 'ghost' ? 1 : 0, borderColor: colors.border, opacity: disabled ? 0.6 : pressed ? 0.9 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({ label, error, hint, ...props }: { label: string; error?: string; hint?: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? colors.green : colors.white, borderColor: active ? colors.green : colors.border }]}
    >
      <Text style={{ color: active ? colors.white : colors.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const BADGE: Record<string, string> = {
  open: '#DCFCE7',
  pending: '#FEF3C7',
  accepted: '#DCFCE7',
  rejected: '#FEE2E2',
  withdrawn: '#E5E7EB',
  completed: '#DBEAFE',
  paused: '#FEF3C7',
  filled: '#DBEAFE',
  closed: '#E5E7EB',
};
export function Badge({ status }: { status: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: BADGE[status] ?? colors.light }]}>
      <Text style={{ fontSize: 11, textTransform: 'capitalize', color: colors.text }}>{status}</Text>
    </View>
  );
}

export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontWeight: '600', color: colors.text }}>{title}</Text>
      {description ? <Text style={{ color: colors.muted, marginTop: 4, textAlign: 'center' }}>{description}</Text> : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <ActivityIndicator color={colors.green} />
      {label ? <Text style={{ color: colors.muted, marginTop: 8 }}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  btn: { borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text, backgroundColor: colors.white },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  error: { fontSize: 12, color: '#DC2626', marginTop: 4 },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 36, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.white },
});
