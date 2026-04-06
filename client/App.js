import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, LogBox, ActivityIndicator, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './src/utils/notificationService';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Contexts
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { SettingsProvider, SettingsContext } from './src/context/SettingsContext';
import { BudgetProvider } from './src/context/BudgetContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { AutoTrackerProvider } from './src/context/AutoTrackerContext';

// Navigation & Screens
import RootNavigator from './src/navigation/RootNavigator';

import ErrorBoundary from './src/components/ErrorBoundary';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync().catch(e => {
      console.error("Push reg error", e);
      Alert.alert('Push Registration Error', e?.message || String(e));
    });

    const defaultHandler = global.ErrorUtils?.getGlobalHandler?.();
    const globalHandler = (error, isFatal) => {
      const message = error?.message || String(error) || 'Unexpected error occurred';
      Alert.alert('Unexpected App Error', `${message}${isFatal ? ' (Fatal)' : ''}`);
      if (typeof defaultHandler === 'function') {
        defaultHandler(error, isFatal);
      }
    };

    if (global.ErrorUtils?.setGlobalHandler) {
      global.ErrorUtils.setGlobalHandler(globalHandler);
    }

    const onUnhandledRejection = (event) => {
      const reason = event?.reason || event;
      const message = reason?.message || String(reason) || 'Unhandled promise rejection';
      Alert.alert('Promise Rejection', message);
    };

    if (typeof globalThis?.addEventListener === 'function') {
      globalThis.addEventListener('unhandledrejection', onUnhandledRejection);
    }

    return () => {
      if (typeof globalThis?.removeEventListener === 'function') {
        globalThis.removeEventListener('unhandledrejection', onUnhandledRejection);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <SettingsProvider>
              <AutoTrackerProvider>
                <SafeAreaProvider>
                  <StatusBar style="auto" />
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <BudgetProvider>
                      <RootNavigator />
                    </BudgetProvider>
                  </GestureHandlerRootView>
                </SafeAreaProvider>
              </AutoTrackerProvider>
            </SettingsProvider>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
