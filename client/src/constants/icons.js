import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

// Mapping for Category Icons
// We use a function to render to allow mixing icon sets if needed
export const getCategoryIcon = (category, size = 24, color = '#000') => {
    switch (category) {
        case 'Food':
            return <Ionicons name="fast-food-outline" size={size} color={color} />;
        case 'Grocery':
            return <Ionicons name="basket-outline" size={size} color={color} />;
        case 'Travel':
            return <Ionicons name="airplane-outline" size={size} color={color} />;
        case 'Fuel':
            return <MaterialCommunityIcons name="gas-station" size={size} color={color} />;
        case 'Medicine':
            return <Ionicons name="medkit-outline" size={size} color={color} />;
        case 'Clothes':
            return <Ionicons name="shirt-outline" size={size} color={color} />;
        case 'Entertainment':
            return <Ionicons name="game-controller-outline" size={size} color={color} />;
        case 'Shopping':
            return <Ionicons name="cart-outline" size={size} color={color} />;
        case 'Salary':
            return <Ionicons name="cash-outline" size={size} color={color} />;
        case 'Scanned':
            return <Ionicons name="receipt-outline" size={size} color={color} />;
        case 'Others':
        default:
            return <Ionicons name="grid-outline" size={size} color={color} />;
    }
};

export const CATEGORY_KEYS = ['Food', 'Grocery', 'Travel', 'Fuel', 'Medicine', 'Clothes', 'Shopping', 'Entertainment', 'Salary'];
