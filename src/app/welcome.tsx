import { router } from 'expo-router';
import { View } from 'react-native';

import { AuthLayout } from '@/components/AuthLayout';
import { Questie } from '@/components/Questie';
import { Button, Pill, T } from '@/components/ui';
import { useAppTheme } from '@/theme/ThemeContext';

export default function Welcome() {
  const { c } = useAppTheme();
  return (
    <AuthLayout
      back={false}
      footer={
        <>
          <Button label="Get started" kind="green" onPress={() => router.push('/sign-up' as never)} />
          <Button label="I already have an account" kind="plain" onPress={() => router.push('/log-in' as never)} />
        </>
      }>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <View style={{ backgroundColor: c.card, borderRadius: 18, borderWidth: 2, borderColor: c.line, paddingHorizontal: 16, paddingVertical: 10 }}>
          <T size={15} weight="heavy">Hi, I’m Questie! I’ll ride with you.</T>
        </View>
        <Questie size={150} />
        <View style={{ alignItems: 'center', gap: 6 }}>
          <T size={40} weight="black">TQuest</T>
          <T size={20} weight="black" color={c.redInk}>Ride. Explore. Quest.</T>
        </View>
        <T size={16} color={c.muted} style={{ textAlign: 'center', lineHeight: 23, paddingHorizontal: 8 }}>
          Follow your train live, hear stops your way, and collect a stamp at every station.
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          <Pill label="Live map" bg={c.redTint} fg={c.redInk} />
          <Pill label="Hear it your way" bg={c.blueTint} fg={c.blueInk} />
          <Pill label="Station stamps" bg={c.goldTint} fg={c.goldInk} />
        </View>
      </View>
    </AuthLayout>
  );
}
