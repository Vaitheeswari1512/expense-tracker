import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { SettingsContext } from '../context/SettingsContext';
import DrawerNavigator from './DrawerNavigator';
import LoadingScreen from '../screens/LoadingScreen';
import BackupPinScreen from '../screens/BackupPinScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const AuthenticatedApp = () => {
    const { isAppLocked } = useContext(SettingsContext) || { isAppLocked: false };
    return isAppLocked ? <BackupPinScreen /> : <DrawerNavigator />;
};

const RootNavigator = () => {
    const { user, isLoading } = useContext(AuthContext);

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
                {isLoading ? (
                    <Stack.Screen name="Splash" component={LoadingScreen} />
                ) : user ? (
                    <Stack.Screen name="Home" component={AuthenticatedApp} />
                ) : (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default RootNavigator;
