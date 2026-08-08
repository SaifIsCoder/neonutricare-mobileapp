import { Screen } from '@/components/ui/screen';
import { EmptyState } from '@/components/ui/state-views';

// Stub only — no backend. PRD.md §2 lists the AI chat assistant as a v1 non-goal.
export default function AssistantScreen() {
  return (
    <Screen title="AI assistant" subtitle="Coming soon">
      <EmptyState
        icon="chatbubbles-outline"
        title="Not available yet"
        body="A guided chat assistant for nutrition and antenatal questions is planned for a future release. Your screenings and records are unaffected."
      />
    </Screen>
  );
}
