import { useState, useRef } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconButton } from '@/components/ui/screen';
import { askRag, type AskResponse } from '@/lib/rag-api';
import { useTheme } from '@/hooks/use-theme';
import { Layout, MaxContentWidth, Radius, Spacing, Fonts } from '@/constants/theme';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AskResponse['sources'];
};

export default function AssistantScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello. I can answer questions using WHO maternal health guidance. What would you like to know?',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    Keyboard.dismiss();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const data = await askRag(text);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Unable to connect to the WHO Assistant. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: theme.primary, borderBottomRightRadius: Radius.sm }
              : { backgroundColor: theme.card, borderBottomLeftRadius: Radius.sm },
          ]}>
          <ThemedText style={{ color: isUser ? theme.onPrimary : theme.text }}>
            {item.content}
          </ThemedText>
          
          {!!item.sources && item.sources.length > 0 && (
            <View style={[styles.sourcesContainer, { borderTopColor: theme.border }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.one }}>
                Sources:
              </ThemedText>
              {item.sources.map((src, idx) => (
                <View key={idx} style={styles.sourceItem}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    [Source {src.rank}]
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Document: {src.source}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Chunk: {src.chunk}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Similarity: {(src.similarity * 100).toFixed(2)}%
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.column}>
            {/* Topbar matching Screen component */}
            <View style={styles.topbar}>
              {router.canGoBack() && (
                <IconButton
                  icon="arrow-back"
                  accessibilityLabel="Go back"
                  onPress={() => router.back()}
                />
              )}
              <ThemedText type="screenTitle" style={styles.topbarTitle} numberOfLines={1}>
                AI health assistant
              </ThemedText>
            </View>

            {/* Chat List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListFooterComponent={
                isLoading ? (
                  <View style={[styles.messageRow, styles.messageRowAssistant]}>
                    <View style={[styles.bubble, { backgroundColor: theme.card, borderBottomLeftRadius: Radius.sm }]}>
                      <ThemedText style={{ color: theme.textSecondary }}>Thinking...</ThemedText>
                    </View>
                  </View>
                ) : null
              }
            />

            {/* Input Area */}
            <View style={[styles.inputArea, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
                ]}
                placeholder="Ask a question..."
                placeholderTextColor={theme.textMuted}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!isLoading}
              />
              <IconButton
                icon="send"
                accessibilityLabel="Send"
                onPress={handleSend}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingHorizontal: Layout.screenPaddingX,
    paddingTop: Spacing.two + 2,
    paddingBottom: Spacing.two,
  },
  topbarTitle: { flex: 1 },
  listContent: {
    paddingHorizontal: Layout.screenPaddingX,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
    paddingLeft: Spacing.six,
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
    paddingRight: Spacing.six,
  },
  bubble: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.lg,
    maxWidth: '100%',
  },
  sourcesContainer: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sourceItem: {
    marginTop: Spacing.one,
    paddingBottom: Spacing.one,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPaddingX,
    paddingVertical: Spacing.four,
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: Layout.controlHeight - 4,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontFamily: Fonts.body,
    fontSize: 14,
    borderWidth: 1,
  },
});
