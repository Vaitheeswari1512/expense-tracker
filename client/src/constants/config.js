import { Platform } from 'react-native';

// ─── Server Configuration ──────────────────────────────────────────────────────
//
//  HOW IT WORKS:
//  • Web (laptop browser) → uses localhost since the browser is on the same machine
//  • Android/iOS (physical phone on same WiFi) → uses the local network IP
//
//  ⚠️  If your WiFi IP changes, update ONLY the line below.
//
const LOCAL_NETWORK_IP = '192.168.111.6';
const SERVER_PORT = 5000;

// Auto-detect the correct host based on platform
const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        // Running in a browser on your laptop → use localhost
        return `http://localhost:${SERVER_PORT}/api`;
    }
    // Running on a physical Android/iOS device on the same WiFi
    return `http://${LOCAL_NETWORK_IP}:${SERVER_PORT}/api`;
};

export const BASE_URL = getBaseUrl();

export default BASE_URL;
