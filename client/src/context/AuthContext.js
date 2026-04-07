import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState, Alert } from 'react-native';
import { jwtDecode } from 'jwt-decode';
import { BASE_URL } from '../constants/config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadUserStatus = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('user');
                const storedToken = await AsyncStorage.getItem('token');
                console.log('AuthContext.loadUserStatus:', { storedUser: !!storedUser, storedToken: !!storedToken });

                if (storedUser && storedToken) {
                    const parsedUser = JSON.parse(storedUser);
                    if (parsedUser) {
                        setUser(parsedUser);
                        setToken(storedToken);
                    } else {
                        await AsyncStorage.clear();
                        setUser(null);
                        setToken(null);
                    }
                } else {
                    setUser(null);
                    setToken(null);
                }
            } catch (e) {
                console.log('loadUser error:', e);
                try { await AsyncStorage.clear(); } catch (err) { }
                setUser(null);
                setToken(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUserStatus();

        // Background Resume Listener
        const appStateSubscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                console.log("App foregrounded, validating session...");
                validateSessionInBackground();
            }
        });

        return () => appStateSubscription.remove();
    }, []);

    const validateSessionInBackground = async () => {
        try {
            const currentToken = await AsyncStorage.getItem('token');
            if (currentToken) {
                const decodedValue = jwtDecode(currentToken);
                if ((decodedValue.exp * 1000) < Date.now()) {
                    console.log("Session expired while backgrounded! Forcing logout.");
                    logout();
                    Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
                }
            }
        } catch (e) {
            console.error('Session resume validation error', e);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            console.log("AuthContext.login response:", { status: response.status, ok: response.ok, data });

            if (response.ok) {
                if (!data.token) {
                    console.error("Login response missing token:", data);
                    return { success: false, error: 'Login failed: invalid server response' };
                }

                const sessionUser = data.user || { email };
                try {
                    console.log("Saving login data to AsyncStorage...");
                    await AsyncStorage.multiSet([
                        ['token', data.token],
                        ['user', JSON.stringify(sessionUser)]
                    ]);
                    console.log("AsyncStorage save complete.");
                } catch (storageErr) {
                    console.error("Storage Error during login:", storageErr);
                    return { success: false, error: 'Device storage failed' };
                }

                setToken(data.token);
                setUser(sessionUser);
                return { success: true };
            } else {
                console.error("Login failed response:", data);
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error("Login server error:", error.message);
            return { success: false, error: 'Network error. Please check your connection.' };
        }
    };

    const register = async (name, email, password, phone) => {
        try {
            const response = await fetch(`${BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, phone })
            });
            const data = await response.json();

            console.log("AuthContext.register response:", { status: response.status, ok: response.ok, data });

            if (response.ok) {
                console.log("Registration Success - Auto logging in...");

                try {
                    await AsyncStorage.multiSet([
                        ['token', data.token],
                        ['user', JSON.stringify(data.user)]
                    ]);
                } catch (storageErr) {
                    console.error("Storage Error during register:", storageErr);
                    return { success: false, error: 'Device storage failed' };
                }

                setToken(data.token);
                setUser(data.user);
                console.log("Register: AsyncStorage saved & state updated");
                return { success: true };
            } else {
                console.error("Register failed response:", data);
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (error) {
            console.error("Register server error:", error.message);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const logout = async () => {
        try {
            // 1. Get all keys to perform a thorough cleanup
            const allKeys = await AsyncStorage.getAllKeys();

            // 2. Identify keys to remove (core auth keys + user-specific scoped keys)
            const keysToRemove = allKeys.filter(key =>
                ['token', 'user', 'transactions', 'profileImage', 'initialBalance', 'lastBackupDate', 'registered_users'].includes(key) ||
                key.startsWith('transactions_') ||
                key.startsWith('app_notifications_') ||
                key.startsWith('profile_image_')
            );

            // 3. Perform removal
            if (keysToRemove.length > 0) {
                await AsyncStorage.multiRemove(keysToRemove);
            }

            // 4. Reset local state
            setToken(null);
            setUser(null);
            console.log("Logout successful - AsyncStorage cleared of all user-specific data.");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const updatePassword = async (oldPassword, newPassword) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/user/update-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'auth-token': token
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });

            const data = await response.json();
            setIsLoading(false);

            if (response.ok) {
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Failed to update password' };
            }
        } catch (error) {
            console.error("Update password error:", error.message);
            setIsLoading(false);
            return { success: false, error: 'Network error. Please check your connection.' };
        }
    };

    const uploadProfilePhoto = async (imageUri) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            const fileName = imageUri.split('/').pop();
            const fileType = fileName.split('.').pop();

            formData.append('profileImage', {
                uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
                name: fileName,
                type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
            });
            formData.append('userId', user?._id);

            const response = await fetch(`${BASE_URL}/user/upload-profile-photo`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'auth-token': token,
                    'userId': user?._id
                },
                body: formData
            });

            const data = await response.json();
            setIsLoading(false);

            if (response.ok) {
                const updatedUser = { ...user, profileImage: data.user.profileImage };
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                await AsyncStorage.setItem('profileImage', data.user.profileImage);

                const usersStr = await AsyncStorage.getItem('registered_users');
                if (usersStr) {
                    const users = JSON.parse(usersStr);
                    const idx = users.findIndex(u => u._id === user._id);
                    if (idx !== -1) {
                        users[idx].profileImage = data.user.profileImage;
                        await AsyncStorage.setItem('registered_users', JSON.stringify(users));
                    }
                }

                setUser(updatedUser);
                return { success: true, user: updatedUser };
            } else {
                return { success: false, error: data.error || 'Failed to upload photo' };
            }
        } catch (error) {
            console.error("Upload profile error:", error.message);
            setIsLoading(false);
            return { success: false, error: 'Network error. Could not upload image.' };
        }
    };

    const deleteProfilePhoto = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/user/profile-photo`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'auth-token': token,
                    'userId': user?._id
                }
            });

            const updatedUser = { ...user, profileImage: null };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            await AsyncStorage.removeItem('profileImage');

            const usersStr = await AsyncStorage.getItem('registered_users');
            if (usersStr) {
                const users = JSON.parse(usersStr);
                const idx = users.findIndex(u => u.email === user?.email || u._id === user?._id);
                if (idx !== -1) {
                    users[idx].profileImage = null;
                    await AsyncStorage.setItem('registered_users', JSON.stringify(users));
                }
            }

            setUser(updatedUser);
            setIsLoading(false);
            return { success: true };
        } catch (error) {
            console.error("AuthContext: Delete network error:", error.message);
            const updatedUser = { ...user, profileImage: null };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            await AsyncStorage.removeItem('profileImage');
            setUser(updatedUser);
            setIsLoading(false);
            return { success: true, warning: 'Offline mode: Removed from device only' };
        }
    };

    return (
        <AuthContext.Provider value={{ login, register, logout, updatePassword, uploadProfilePhoto, deleteProfilePhoto, isLoading, token, user, setUser, BASE_URL }}>
            {children}
        </AuthContext.Provider>
    );
};
