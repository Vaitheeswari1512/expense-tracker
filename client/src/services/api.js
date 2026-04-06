import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { BASE_URL } from '../constants/config';

class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}

// Global interceptor for network and API calls
const apiCall = async (endpoint, options = {}, authContextObj = null) => {
    try {
        const token = await AsyncStorage.getItem('token');
        
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'auth-token': token }),
            ...options.headers,
        };

        const config = {
            ...options,
            headers,
        };

        const response = await fetch(`${BASE_URL}${endpoint}`, config);

        // 401 Unauthorized Interception
        if (response.status === 401) {
            console.error("API Interceptor: 401 Unauthorized detected. Forcing logout.");
            // Force logout if context is provided
            if (authContextObj && authContextObj.logout) {
                await authContextObj.logout();
            } else {
                // Fallback hard drop
                await AsyncStorage.clear();
            }
            throw new ApiError('Session expired. Please log in again.', 401);
        }

        const data = await response.json();

        if (!response.ok) {
            throw new ApiError(data.error || data.message || 'API Error', response.status);
        }

        return data;
    } catch (error) {
        // Network failures (offline) won't have a status
        if (!error.status) {
            console.error("API Interceptor: Network Failure -", error.message);
            Alert.alert("Network Error", "Please check your internet connection.");
            throw new ApiError('Network connection failed', 0);
        }
        throw error;
    }
};

export default apiCall;
