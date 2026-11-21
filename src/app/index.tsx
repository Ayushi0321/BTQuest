import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { askGemini } from '../api/gemini';

export default function Home() {
  const [answer, setAnswer] = useState('Tap the button to meet Ken');
  const [loading, setLoading] = useState(false);

  async function test() {
    setLoading(true);
    try {
      setAnswer(await askGemini(
        'You are Ken, the cheerful mascot of Kendall/MIT station on the Boston Red Line. Greet a rider in 2 short sentences.'
      ));
    } catch (e) {
      setAnswer('Error: ' + String(e));
    }
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 20, backgroundColor: '#F7F5F0' }}>
      <Text style={{ fontSize: 36, fontWeight: '900', color: '#1E2A38' }}>TQuest</Text>
      <Text style={{ fontSize: 18, lineHeight: 26, color: '#1E2A38' }}>{answer}</Text>
      <Pressable
        onPress={test}
        style={{ backgroundColor: '#C64B41', padding: 18, borderRadius: 16, borderBottomWidth: 4, borderBottomColor: '#9C3830' }}
      >
        <Text style={{ color: '#fff', fontWeight: '900', textAlign: 'center', fontSize: 17 }}>
          {loading ? 'ASKING KEN…' : 'ASK KEN'}
        </Text>
      </Pressable>
    </View>
  );
}