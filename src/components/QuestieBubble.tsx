import { Text, View } from 'react-native';

import { Questie } from '@/components/Questie';
import { useQuestieSpeaking } from '@/lib/questieVoice';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

/** Questie with a speech bubble — the on-screen text of whatever Questie is saying. */
export function QuestieBubble({ text, loading, dark = false }: { text?: string; loading?: boolean; dark?: boolean }) {
  const { c } = useAppTheme();
  const talking = useQuestieSpeaking();
  if (!text && !loading) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, alignSelf: 'stretch' }} accessibilityLiveRegion="polite">
      <Questie size={52} talking={talking && !loading} />
      <View style={{ flex: 1, backgroundColor: dark ? 'rgba(255,255,255,0.95)' : c.card, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 2, borderColor: dark ? 'transparent' : c.line, padding: 12 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 21, color: dark ? '#1E2A38' : c.text, fontStyle: loading ? 'italic' : 'normal' }}>
          {loading ? 'Questie is thinking…' : text}
        </Text>
      </View>
    </View>
  );
}
