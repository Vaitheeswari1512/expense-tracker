import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, SIZES, RESPONSIVE } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';

const isWeb = Platform.OS === 'web';

const CustomInput = ({ icon, iconName, placeholder, value, onChangeText, isPassword, ...props }) => {
    const { theme } = React.useContext(ThemeContext);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const displayIcon = icon || iconName;

    return (
        <View style={[
            styles.inputContainer, 
            { 
                backgroundColor: theme.colors.inputBackground || theme.colors.card,
                borderColor: isFocused ? COLORS.primary : theme.colors.border,
                borderWidth: 1
            }
        ]}>
            {displayIcon && <Icon name={displayIcon} size={20} color={isFocused ? COLORS.primary : theme.colors.subText} style={styles.icon} />}
            <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={value}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.subText}
                onChangeText={onChangeText}
                secureTextEntry={isPassword && !isPasswordVisible}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                {...props}
            />
            {isPassword && (
                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                    <Icon
                        name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={theme.colors.subText}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radius,
        marginBottom: isWeb ? 16 : RESPONSIVE.hp(2),
        paddingHorizontal: isWeb ? 16 : RESPONSIVE.wp(4),
        height: isWeb ? 52 : RESPONSIVE.hp(6.5),
        width: '100%'
    },
    icon: {
        marginRight: isWeb ? 10 : RESPONSIVE.wp(2.5)
    },
    input: {
        flex: 1,
        color: COLORS.black,
        
    }
});

export default CustomInput;
