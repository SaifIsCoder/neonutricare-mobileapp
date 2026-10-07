import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, ListCard, SectionLabel } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ErrorState, SkeletonCard } from '@/components/ui/state-views';
import { TextField } from '@/components/ui/text-field';
import { Layout, Radius, Spacing } from '@/constants/theme';
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
          <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
            <ThemedText type="subtitle" style={{ color: theme.primaryDark }}>
              {displayName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>

          <ThemedText type="cardTitle">{displayName}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
            {email}
          </ThemedText>
        </View>
      )}

      {editing && (
        <Card>
          <TextField
            label="Full name"
            value={draftName}
            onChangeText={setDraftName}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={saveName}
            editable={!saving}
          />
          <View style={styles.editActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setEditing(false)}
              disabled={saving}
              style={styles.editButton}
            />
            <Button title="Save" onPress={saveName} loading={saving} style={styles.editButton} />
          </View>
        </Card>
      )}

      <SectionLabel>Account</SectionLabel>

      <View style={styles.list}>
        {!editing && (
          <ListCard
            icon="pencil"
            tone="teal"
            title="Edit profile"
            subtitle={
              profile?.created_at
                ? `Member since ${new Date(profile.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    year: 'numeric',
                  })}`
                : 'Update your display name'
            }
            onPress={startEditing}
          />
        )}

        <ListCard
          icon="woman"
          tone="blue"
          title="Maternal support"
          subtitle="Pregnancy, nutrition and checkup guides"
          onPress={() => router.push('/maternal')}
        />

        <ListCard
          icon="chatbubbles"
          tone="teal"
          title="AI health assistant"
          subtitle="Chat with our health assistant"
          onPress={() => router.push('/assistant')}
        />
      </View>

      {!loading && !error && profile === null && (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          No profile row found — the handle_new_user trigger did not fire on signup. See
          supabase/schema.sql §5.
        </ThemedText>
      )}

      <SectionLabel>About</SectionLabel>

      <Card>
        <ThemedText type="cardTitle">About NeoNutriCare</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          AI-assisted newborn malnutrition risk screening and maternal support. Results are a
          screening indication, not a diagnosis — always consult a qualified health provider.
        </ThemedText>
      </Card>

      <ListCard
        icon="log-out"
        tone="amber"
        title="Logout"
        subtitle={email}
        onPress={signingOut ? undefined : onSignOut}
        trailing={signingOut ? <ActivityIndicator color={theme.warning} /> : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    gap: Spacing.half,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.xxl - 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  editActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  editButton: { flex: 1 },
  list: { gap: Layout.listGap },
});
