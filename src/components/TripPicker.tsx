/**
 * TripPicker: check in for a ride. Pick the line, then "From", then "To".
 * Only destinations reachable without changing trains are listed.
 * `initial` skips ahead (e.g. when we guessed the rider's line and station). Remount with a new `key` to apply it.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LINES, lineById, lineColors, type LineId } from '@/data/lines';
import { stationById } from '@/data/stations';
import { planTrip } from '@/lib/linePlan';
import { font } from '@/theme/colors';
import { useAppTheme } from '@/theme/ThemeContext';

type Props = {
  visible: boolean;
  initial?: { line: LineId; from?: string };
  onPick: (line: LineId, from: string, to: string) => void;
  onClose: () => void;
};

export function TripPicker({ visible, initial, onPick, onClose }: Props) {
  const { c } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [lineId, setLineId] = useState<LineId | null>(initial?.line ?? null);
  const [from, setFrom] = useState<string | null>(initial?.from ?? null);

  const reset = () => {
    setLineId(null);
    setFrom(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const back = () => (from ? setFrom(null) : lineId ? setLineId(null) : close());
  const choose = (id: string) => {
    if (!lineId) return;
    if (!from) return setFrom(id);
    onPick(lineId, from, id);
    reset();
  };

  const line = lineId ? lineById(lineId) : null;
  const lc = line ? lineColors(c, line) : null;
  const options = line ? line.stations.filter((id) => !from || !('error' in planTrip(line.id, from, id))) : [];
  const step = !line ? 1 : !from ? 2 : 3;
  const title = !line ? 'Which line are you riding?' : !from ? 'Where are you starting?' : `From ${stationById(from)?.name} to…`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '85%', backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 18, paddingBottom: insets.bottom + 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.black, fontSize: 12, letterSpacing: 1.2, color: c.muted }}>{`STEP ${step} OF 3`}</Text>
              <Text style={{ fontFamily: font.black, fontSize: 22, color: c.text }}>{title}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={step === 1 ? close : back} hitSlop={10}>
              <Text style={{ fontFamily: font.black, fontSize: 15, color: c.blueBtn }}>{step === 1 ? 'Close' : 'Back'}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, gap: line ? 0 : 10, paddingTop: line ? 0 : 6 }}>
            {!line
              ? LINES.map((l) => {
                  const col = lineColors(c, l);
                  const ends = [l.stations[0], l.stations[l.stations.length - 1]].map((id) => stationById(id)?.name).join(' ↔ ');
                  return (
                    <Pressable
                      key={l.id}
                      accessibilityRole="button"
                      onPress={() => setLineId(l.id)}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20,
                        borderWidth: 2, borderBottomWidth: 5, borderColor: c.line, backgroundColor: col.tint, opacity: pressed ? 0.7 : 1,
                      })}>
                      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: col.main, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: font.black, fontSize: 17, color: '#fff' }}>{l.short}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: font.black, fontSize: 18, color: c.text }}>{l.name}</Text>
                        <Text style={{ fontFamily: font.bold, fontSize: 13, color: c.muted }}>{ends}</Text>
                      </View>
                    </Pressable>
                  );
                })
              : options.map((id) => {
                  const s = stationById(id);
                  if (!s) return null;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      onPress={() => choose(id)}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13,
                        borderBottomWidth: 1, borderBottomColor: c.line, opacity: pressed ? 0.6 : 1,
                      })}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: lc!.main, backgroundColor: id === from ? lc!.main : c.card }} />
                      <Text style={{ flex: 1, fontFamily: font.heavy, fontSize: 17, color: c.text }}>{s.name}</Text>
                      {s.branch && line.id === 'Red' ? <Text style={{ fontFamily: font.bold, fontSize: 12, color: c.muted }}>{s.branch === 'ashmont' ? 'Ashmont branch' : 'Braintree branch'}</Text> : null}
                    </Pressable>
                  );
                })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
