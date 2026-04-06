import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const authContext = useContext(AuthContext) || {};
    const { BASE_URL, token, user } = authContext; // Extract user from AuthContext
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Get user-specific key
    const getNotifKey = useCallback(() => {
        return user?._id ? `app_notifications_${user._id}` : 'app_notifications_guest';
    }, [user]);

    const fetchNotifications = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        try {
            // 1. Fetch from Backend (Primary)
            const response = await axios.get(`${BASE_URL}/notifications`, {
                headers: { 'auth-token': token }
            });
            
            if (response.data) {
                setNotifications(response.data);
                setUnreadCount(response.data.filter(n => !n.read).length);
                
                // Backup to AsyncStorage for offline view
                const key = getNotifKey();
                await AsyncStorage.setItem(key, JSON.stringify(response.data));
            }
        } catch (e) {
            console.log("Error fetching server notifications, trying local storage...", e.message);
            // Fallback to local storage
            const key = getNotifKey();
            const data = await AsyncStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                setNotifications(parsed);
                setUnreadCount(parsed.filter(n => !n.read).length);
            }
        } finally {
            setLoading(false);
        }
    }, [BASE_URL, token, getNotifKey]);

    const addNotification = useCallback(async (title, message = "", type = "info") => {
        // If not logged in, we only use local storage
        if (!token) {
            const newNotif = {
                _id: `local_${Date.now().toString()}`,
                title,
                message,
                type,
                read: false,
                createdAt: new Date().toISOString()
            };
            try {
                const key = getNotifKey();
                const data = await AsyncStorage.getItem(key);
                const parsed = data ? JSON.parse(data) : [];
                const updated = [newNotif, ...parsed];
                await AsyncStorage.setItem(key, JSON.stringify(updated));
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadCount(prev => prev + 1);
            } catch (e) {
                console.log("Error adding local notification", e);
            }
            return;
        }

        try {
            // 1. POST to Backend (Persist)
            const response = await axios.post(`${BASE_URL}/notifications`, 
                { title, message, type },
                { headers: { 'auth-token': token } }
            );

            if (response.data) {
                // 2. Update Context state with the real server notification (including DB _id)
                setNotifications(prev => [response.data, ...prev]);
                setUnreadCount(prev => prev + 1);
                
                // 3. Update Storage backup
                const key = getNotifKey();
                const data = await AsyncStorage.getItem(key);
                const parsed = data ? JSON.parse(data) : [];
                const updated = [response.data, ...parsed];
                await AsyncStorage.setItem(key, JSON.stringify(updated));
            }
        } catch (e) {
            console.log("Error adding server notification", e);
        }
    }, [BASE_URL, token, getNotifKey]);

    const markAllAsRead = useCallback(async () => {
        if (!token) return;
        try {
            // 1. Update Backend
            await axios.put(`${BASE_URL}/notifications/mark-read`, {}, {
                headers: { 'auth-token': token }
            });

            // 2. Update Local State
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);

            // 3. Update AsyncStorage
            const key = getNotifKey();
            const data = await AsyncStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                const updated = parsed.map(n => ({ ...n, read: true }));
                await AsyncStorage.setItem(key, JSON.stringify(updated));
            }
        } catch (e) {
            console.log("Error marking notifications as read", e);
        }
    }, [BASE_URL, token, getNotifKey]);

    const markAsRead = useCallback(async (id) => {
        if (!token || id.startsWith('local_')) {
            // Local-only if it's a local notification or no token
            setNotifications(prev => {
                const updated = prev.map(n => n._id === id ? { ...n, read: true } : n);
                setUnreadCount(updated.filter(n => !n.read).length);
                return updated;
            });
            return;
        }

        try {
            // 1. Update Backend
            await axios.put(`${BASE_URL}/notifications/${id}/read`, {}, {
                headers: { 'auth-token': token }
            });

            // 2. Update Local State
            setNotifications(prev => {
                const updated = prev.map(n => n._id === id ? { ...n, read: true } : n);
                setUnreadCount(updated.filter(n => !n.read).length);
                return updated;
            });
        } catch (e) {
            console.log("Error marking notification as read", e);
        }
    }, [BASE_URL, token]);

    const deleteNotification = useCallback(async (id) => {
        console.log("Deleting:", id);
        // Optimistic Update
        const previousNotifs = [...notifications];
        setNotifications(prev => prev.filter(n => n._id !== id));
        setUnreadCount(prev => prev - (previousNotifs.find(n => n._id === id && !n.read) ? 1 : 0));

        if (!token || id.startsWith('local_')) {
            // Simply remove local ones from storage
            const key = getNotifKey();
            const updated = previousNotifs.filter(n => n._id !== id);
            await AsyncStorage.setItem(key, JSON.stringify(updated));
            return;
        }

        try {
            await axios.delete(`${BASE_URL}/notifications/${id}`, {
                headers: { 'auth-token': token }
            });
            // Also update storage backup
            const key = getNotifKey();
            const data = await AsyncStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                const updated = parsed.filter(n => n._id !== id);
                await AsyncStorage.setItem(key, JSON.stringify(updated));
            }
        } catch (e) {
            console.log("Error deleting notification", e);
            setNotifications(previousNotifs); // Rollback
            throw e;
        }
    }, [BASE_URL, token, notifications, getNotifKey]);

    const deleteAllNotifications = useCallback(async () => {
        console.log("Deleting All Notifications");
        const previousNotifs = [...notifications];
        setNotifications([]);
        setUnreadCount(0);

        if (!token) {
            const key = getNotifKey();
            await AsyncStorage.removeItem(key);
            return;
        }

        try {
            await axios.delete(`${BASE_URL}/notifications`, {
                headers: { 'auth-token': token }
            });
            const key = getNotifKey();
            await AsyncStorage.removeItem(key);
        } catch (e) {
            console.log("Error deleting all notifications", e);
            setNotifications(previousNotifs); // Rollback
            throw e;
        }
    }, [BASE_URL, token, notifications, getNotifKey]);

    // Reset and Fetch
    useEffect(() => {
        if (!token) {
            setNotifications([]);
            setUnreadCount(0);
        } else {
            fetchNotifications();
        }
    }, [token, user?._id, fetchNotifications]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            fetchNotifications,
            addNotification,
            markAllAsRead,
            markAsRead,
            deleteNotification,
            deleteAllNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
