import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

// Order here = order in the tab bar. "scan" sits in the middle as the big gold button.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="rewards" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="board" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
