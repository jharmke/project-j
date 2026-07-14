import { Tabs } from 'expo-router';
import React from 'react';
import CustomTabBar from '../../components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarHideOnKeyboard: true,
        // ABSOLUTE tab bar. Previously the bar occupied layout space, so every screen's box STOPPED at
        // the top of it: a screen's background could never reach the bottom of the device, and nothing
        // ever passed underneath the bar. That is why a frosted bar looked like a grey wall -- it was
        // blurring the navigator's flat backdrop, because there was genuinely nothing behind it.
        // Now each screen paints all the way to the device edge and its content scrolls beneath the
        // glass. Every tab reserves TAB_BAR_HEIGHT + inset at the bottom of its scroll so nothing hides
        // under the bar, and anything anchored to the bottom (Profile's save bar, the Otto FAB) clears it
        // explicitly.
        tabBarStyle: { position: 'absolute' },
      }}>
      <Tabs.Screen name="log" options={{ title: 'Log' }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout' }} />
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="faith" options={{ title: 'Faith' }} />
    </Tabs>
  );
}