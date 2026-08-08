import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ErrorState, SkeletonCard } from '@/components/ui/state-views';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAsyncData } from '@/hooks/use-async-data';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type Profile = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const userId = session!.user.id;

  const load = useCallback(async (): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }, [userId]);

  const { data: profile, error, loading, refreshing, refresh } = useAsyncData(load);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const email = profile?.email ?? session?.user.email ?? '—';
  const displayName = profile?.full_name?.trim() || email.split('@')[0];

  function startEditing() {
    setDraftName(profile?.full_name ?? '');
    setActionError(null);
    setEditing(true);
  }

  async function saveName() {
    if (!draftName.trim()) {
      setActionError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: draftName.trim(), updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) throw new Error(updateError.message);
      setEditing(false);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save your name.');
    } finally {
      setSaving(false);
    }
  }

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      // The root guard swaps back to (auth) once the session clears.
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not sign out.';
      if (Platform.OS === 'web') setActionError(message);
      else Alert.alert('Sign out failed', message);
      setSigningOut(false);
    }
  }

  return (
    <Screen title="Profile" onRefresh={refresh} refreshing={refreshing}>
      {!!error && <ErrorState message={error} onRetry={refresh} />}
      {!!actionError && <ErrorState message={actionError} />}

      {loading && !error ? (
        <SkeletonCard lines={3} />
      ) : (
        <View style={styles.identity}>
          {/* Initials stand in for an uploaded avatar. Real image upload needs
              expo-image-picker plus the `avatars` bucket (supabase/schema.sql §6). */}
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText style={[styles.avatarText, { color: theme.onPrimary }]}>
              {displayName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>

          <View style={styles.identityText}>
            <ThemedText type="smallBold">{displayName}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
              {email}
            </ThemedText>
          </View>
        </View>
      )}

      {editing ? (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <TextField
            label="Full name"
            value={draftName}
            onChangeText={setDraftName}
            autoCapitalize="words"
            editable={!saving}
          />
          <View style={styles.editActions}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setEditing(false)}
              disabled={saving}
              style={styles.editButton}
            />
            <Button title="Save" onPress={saveName} loading={saving} style={styles.editButton} />
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Row label="Name" value={profile?.full_name?.trim() || '—'} />
          <Row label="Email" value={email} />
          <Row
            label="Member since"
            value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
          />
          <Button title="Edit profile" variant="secondary" onPress={startEditing} />
        </View>
      )}

      {!loading && !error && profile === null && (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          No profile row found — the handle_new_user trigger did not fire on signup. See
          supabase/schema.sql §5.
        </ThemedText>
      )}

      <View style={styles.links}>
        <LinkRow
          icon="heart-outline"
          title="Maternal support"
          onPress={() => router.push('/maternal')}
        />
        <LinkRow
          icon="chatbubbles-outline"
          title="AI assistant"
          onPress={() => router.push('/assistant')}
        />
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <ThemedText type="smallBold">About NeoNutriCare</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          AI-assisted newborn malnutrition risk screening and maternal support. Results are a
          screening indication, not a diagnosis — always consult a qualified health provider.
        </ThemedText>
      </View>

      <Button title="Log out" variant="secondary" onPress={onSignOut} loading={signingOut} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.rowValue} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

function LinkRow({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkRow,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Ionicons name={icon} size={20} color={theme.primary} />
      <ThemedText type="small" style={styles.linkTitle}>
        {title}
      </ThemedText>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  identityText: { flex: 1, gap: Spacing.half },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  editActions: { flexDirection: 'row', gap: Spacing.two },
  editButton: { flex: 1 },
  links: { gap: Spacing.two },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkTitle: { flex: 1 },
});
