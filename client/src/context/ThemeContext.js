import React, { createContext, useState } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleTheme = () => {
        setIsDarkMode(prev => !prev);
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => !prev);
    };

    const theme = {
        dark: isDarkMode,
        colors: {
            // Backgrounds
            background: isDarkMode ? '#0D0F1A' : '#F0F2FF',
            backgroundSecondary: isDarkMode ? '#131629' : '#E8EAF6',
            card: isDarkMode ? '#1A1D2E' : '#FFFFFF',
            cardGlass: isDarkMode ? 'rgba(26, 29, 46, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            cardAlt: isDarkMode ? '#1F2235' : '#F8F9FF',

            // Text
            text: isDarkMode ? '#E8EAF6' : '#1A1A2E',
            textSecondary: isDarkMode ? '#B0B8D0' : '#4A5568',
            subText: isDarkMode ? '#7C85A2' : '#6B7280',
            heading: isDarkMode ? '#FFFFFF' : '#0D0D1A',

            // Brand
            primary: '#6C63FF',
            primaryLight: isDarkMode ? 'rgba(108, 99, 255, 0.2)' : 'rgba(108, 99, 255, 0.1)',
            accent: '#48CAE4',
            accentPink: '#FF6584',

            // Borders
            border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(108, 99, 255, 0.12)',
            borderLight: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',

            // Input
            inputBackground: isDarkMode ? '#1F2235' : '#F8F9FF',
            inputBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(108,99,255,0.2)',

            // Status
            danger: '#FF4D6D',
            success: '#00D68F',
            warning: '#FFB800',

            // Sidebar
            sidebarBg: isDarkMode ? 'rgba(13, 15, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            sidebarBorder: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(108, 99, 255, 0.1)',
            activeItem: isDarkMode ? 'rgba(108, 99, 255, 0.2)' : 'rgba(108, 99, 255, 0.1)',

            // Chart
            chartBg: isDarkMode ? '#1A1D2E' : '#FFFFFF',

            // Nav indicator
            navIndicator: '#6C63FF',

            // Shadow
            shadow: isDarkMode ? '#000000' : '#6C63FF',
        }
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme, isSidebarCollapsed, toggleSidebar }}>
            {children}
        </ThemeContext.Provider>
    );
};
