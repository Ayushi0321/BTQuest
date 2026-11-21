import { View } from 'react-native';

import { Button, Card, Kicker, Screen, T } from '@/components/ui';
import { useAppTheme } from '@/theme/ThemeContext';

// SCAN tab — artwork hunt.
// TODO: use expo-camera's CameraView with barcodeScannerSettings={{ barcodeTypes: ['qr'] }},
// check the rider's location with expo-location, then show the reward screen.
export default function Scan() {
  const { c } = useAppTheme();
  return (
    <Screen title="Scan artwork">
      <Card tint={c.goldTint}>
        <Kicker color={c.goldInk}>Artwork here</Kicker>
        <T size={19} weight="black">Kendall Band</T>
        <T size={13} color={c.goldInk}>Scan the QR on its plaque · +50 and an artwork stamp</T>
      </Card>
      <View style={{ height: 300, borderRadius: 26, backgroundColor: '#0E1218', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 180, height: 180, borderRadius: 18, borderWidth: 6, borderColor: '#E6B23A', borderStyle: 'dashed' }} />
        <T size={14} color="#E7ECF2" style={{ position: 'absolute', bottom: 14 }}>Camera goes here</T>
      </View>
      <Button label="Demo: scan the code" kind="gold" />
    </Screen>
  );
}
