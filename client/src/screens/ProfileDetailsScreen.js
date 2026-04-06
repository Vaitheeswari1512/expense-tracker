import React, { useState, useContext, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '../components/Text';
import { View, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated, Platform, SafeAreaView } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { AuthContext } from '../context/AuthContext';
import { COLORS, SIZES, SHADOWS, RESPONSIVE } from '../constants/theme';
import { Ionicons as Icon } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

const isWeb = Platform.OS === 'web';

const ProfileDetailsScreen = ({ navigation }) => {
    const { user, setUser, updatePassword, logout, uploadProfilePhoto, deleteProfilePhoto } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);

    const [name, setName] = useState(user?.name || 'User');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [profileImage, setProfileImage] = useState(null);
    
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isOldPassVisible, setIsOldPassVisible] = useState(false);
    const [pendingImageUri, setPendingImageUri] = useState(null);

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    // Load stored image on mount
    useEffect(() => {
        const loadImage = async () => {
            const savedImage = await AsyncStorage.getItem('profileImage');
            if (savedImage) setProfileImage(savedImage);
        };
        loadImage();
    }, []);

    useEffect(() => {
        if (user) {
            console.log("User data updated, syncing profile fields:", user.name);
            setName(user.name || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
            
            // Avoid overwriting a newly picked image that hasn't been saved yet
            if (user.profileImage !== undefined && !pendingImageUri) {
                setProfileImage(user.profileImage);
            }
        }
    }, [user]);

    const pickImage = async (sourceType = 'gallery') => {
        try {
            const useCamera = sourceType === 'camera';
            
            // Request permissions (only usually needed on mobile)
            if (Platform.OS !== 'web') {
                const permissionResult = useCamera 
                    ? await ImagePicker.requestCameraPermissionsAsync() 
                    : await ImagePicker.requestMediaLibraryPermissionsAsync();

                if (permissionResult.granted === false) {
                    Alert.alert("Permission Required", "Please allow access to your " + (useCamera ? "camera" : "gallery"));
                    return;
                }
            }

            const options = {
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
            };

            const result = useCamera
                ? await ImagePicker.launchCameraAsync(options)
                : await ImagePicker.launchImageLibraryAsync(options);

            if (!result.canceled) {
                const selectedUri = result.assets[0].uri;
                setProfileImage(selectedUri);
                setPendingImageUri(selectedUri);
                await AsyncStorage.setItem('profileImage', selectedUri);
            }
        } catch (error) {
            setUploadingImage(false);
            if (Platform.OS === 'web') alert("Could not select image: " + error.message);
            else Alert.alert("Error", "Could not select image: " + error.message);
        }
    };

    const handleImagePress = () => {
        if (Platform.OS === 'web') {
            const choice = window.confirm("Do you want to use the Camera? (OK for Camera, Cancel for Gallery)");
            choice ? pickImage('camera') : pickImage('gallery');
        } else {
            const options = [
                { text: "Take Photo", onPress: () => pickImage('camera') },
                { text: "Choose from Gallery", onPress: () => pickImage('gallery') },
            ];
            
            if (profileImage) {
                options.push({ text: "Delete Photo", onPress: handleDeleteImage, style: "destructive" });
            }
            
            options.push({ text: "Cancel", style: "cancel" });

            Alert.alert("Profile Photo", "Choose an action", options);
        }
    };

    const handleDeleteImage = async () => {
        console.log("Delete clicked");
        if (Platform.OS === 'web') {
            const confirm = window.confirm("Are you sure you want to remove your profile photo?");
            if (confirm) {
                setUploadingImage(true);
                const res = await deleteProfilePhoto();
                if (res.success) {
                    setProfileImage(null);
                    setPendingImageUri(null);
                    await AsyncStorage.removeItem('profileImage');
                    console.log("Delete success: State and AsyncStorage cleared");
                }
                setUploadingImage(false);
            }
        } else {
            Alert.alert(
                "Delete Photo",
                "Are you sure you want to remove your profile photo?",
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Delete", 
                        style: "destructive", 
                        onPress: async () => {
                            console.log("Confirmed delete");
                            setUploadingImage(true);
                            // Call context method to update backend/central state
                            const res = await deleteProfilePhoto();
                            if (res.success) {
                                // Update local state immediately
                                setProfileImage(null);
                                setPendingImageUri(null);
                                // Remove specific key as requested
                                await AsyncStorage.removeItem('profileImage');
                                console.log("Delete success: State cleared");
                            }
                            setUploadingImage(false);
                        } 
                    }
                ]
            );
        }
    };

    const handleUpdate = async () => {
        if (!name || !email) {
            Alert.alert('Error', 'Name and Email are required');
            return;
        }

        setLoading(true);
        try {
            let currentProfileImage = profileImage;

            // 1. Handle pending image upload if exists
            if (pendingImageUri) {
                setUploadingImage(true);
                const uploadResult = await uploadProfilePhoto(pendingImageUri);
                setUploadingImage(false);
                
                if (uploadResult.success) {
                    currentProfileImage = uploadResult.user.profileImage;
                    setPendingImageUri(null); // Clear pending
                    await AsyncStorage.setItem('profileImage', currentProfileImage);
                } else {
                    setLoading(false);
                    if (Platform.OS === 'web') alert("Image upload failed: " + uploadResult.error);
                    else Alert.alert('Error', 'Image upload failed: ' + uploadResult.error);
                    return;
                }
            }

            // 2. Emulate backend update for personal info
            const updatedUser = { ...user, name, email, phone, profileImage: currentProfileImage };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            setLoading(false);
            if (Platform.OS === 'web') alert("Profile updated successfully!");
            else Alert.alert('Success', 'Profile info updated successfully');
        } catch (err) {
            setLoading(false);
            if (Platform.OS === 'web') alert("Failed to update profile info");
            else Alert.alert('Error', 'Failed to update profile info');
        }
    };


    const renderHeader = () => (
        <LinearGradient
            colors={[COLORS.gradientStart, '#A56EFF', COLORS.gradientEnd]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.headerCircle1} />
            <View style={styles.headerCircle2} />

            <View style={styles.headerInner}>
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.navBtn}>
                    <Icon name="menu" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <Text style={styles.headerSubtitle}>Keep your info up to date</Text>
                </View>
                <View style={[styles.headerIconCircle, { overflow: 'hidden' }]}>
                    {user?.profileImage ? (
                        <Image source={{ uri: user.profileImage }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                        <Icon name="person" size={24} color={COLORS.white} />
                    )}
                </View>
            </View>
        </LinearGradient>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ResponsiveContainer useSafeArea={false} style={{ flex: 1 }}>
                {renderHeader()}
                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                        {/* Avatar Area */}
                        <View style={styles.avatarSection}>
                            <TouchableOpacity 
                                style={[styles.avatarBox, { backgroundColor: theme.colors.card }]} 
                                onPress={handleImagePress}
                                activeOpacity={0.8}
                            >
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                                ) : (
                                    <LinearGradient
                                        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                                        style={styles.avatarGradient}
                                    >
                                        <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : 'U'}</Text>
                                    </LinearGradient>
                                )}
                                {uploadingImage && (
                                    <View style={styles.uploadOverlay}>
                                        <ActivityIndicator color={COLORS.white} />
                                    </View>
                                )}
                            </TouchableOpacity>

                            {profileImage && (
                                <View style={[styles.avatarActions, { justifyContent: 'center' }]}>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary + '15' }]} onPress={handleImagePress}>
                                        <Icon name="camera" size={18} color={COLORS.primary} />
                                        <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Change</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.danger + '15' }]} onPress={handleDeleteImage}>
                                        <Icon name="trash-outline" size={18} color={COLORS.danger} />
                                        <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {!profileImage && (
                                <View style={styles.avatarActions}>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary + '15' }]} onPress={handleImagePress}>
                                        <Icon name="cloud-upload-outline" size={18} color={COLORS.primary} />
                                        <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Upload Photo</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <Text style={[styles.userName, { color: theme.colors.text }]}>{name}</Text>
                            <Text style={[styles.userEmail, { color: theme.colors.subText }]}>{email}</Text>
                        </View>

                        {/* Form Area */}
                        <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
                            <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.border }]}>
                                <Icon name="person-circle-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.colors.subText }]}>Full Name</Text>
                                <View style={[styles.inputBox, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                                    <Icon name="person-outline" size={20} color={theme.colors.subText} style={{ marginRight: 12 }} />
                                    <TextInput
                                        style={[styles.input, { color: theme.colors.text }]}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Enter your name"
                                        placeholderTextColor={theme.colors.subText}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.colors.subText }]}>Email Address</Text>
                                <View style={[styles.inputBox, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                                    <Icon name="mail-outline" size={20} color={theme.colors.subText} style={{ marginRight: 12 }} />
                                    <TextInput
                                        style={[styles.input, { color: theme.colors.text }]}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="Enter your email"
                                        placeholderTextColor={theme.colors.subText}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={false}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.colors.subText }]}>Phone Number</Text>
                                <View style={[styles.inputBox, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                                    <Icon name="call-outline" size={20} color={theme.colors.subText} style={{ marginRight: 12 }} />
                                    <TextInput
                                        style={[styles.input, { color: theme.colors.text }]}
                                        value={phone}
                                        onChangeText={setPhone}
                                        placeholder="Enter your phone"
                                        placeholderTextColor={theme.colors.subText}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.saveBtn, { marginBottom: 30 }, loading && { opacity: 0.7 }]} 
                                onPress={handleUpdate}
                                disabled={loading}
                            >
                                <LinearGradient colors={['#A56EFF', COLORS.gradientEnd]} style={styles.saveBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                    <Text style={styles.saveBtnText}>Update Info</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Password Section */}
                            <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.border, marginTop: 10 }]}>
                                <Icon name="lock-closed-outline" size={20} color={COLORS.expense} style={{ marginRight: 8 }} />
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Security</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: theme.colors.subText }]}>Current Password</Text>
                                <View style={[styles.inputBox, { backgroundColor: theme.colors.cardAlt, borderColor: theme.colors.border }]}>
                                    <Icon name="key-outline" size={18} color={theme.colors.subText} style={{ marginRight: 12 }} />
                                    <TextInput
                                        style={[styles.input, { color: theme.colors.text }]}
                                        value={user?.password || ''}
                                        editable={false}
                                        secureTextEntry={!isOldPassVisible}
                                    />
                                    <TouchableOpacity onPress={() => setIsOldPassVisible(!isOldPassVisible)}>
                                        <Icon name={isOldPassVisible ? "eye-off-outline" : "eye-outline"} size={20} color={theme.colors.subText} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                </ScrollView>
            </ResponsiveContainer>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: isWeb ? RESPONSIVE.hp(4) : RESPONSIVE.hp(6),
        paddingBottom: RESPONSIVE.hp(4),
        paddingHorizontal: RESPONSIVE.wp(5),
        overflow: 'hidden',
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
    },
    headerCircle1: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.06)', top: -70, right: -40,
    },
    headerCircle2: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: 20,
    },
    navBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    headerTitle: { color: COLORS.white,  fontWeight: '800', fontSize: RESPONSIVE.moderateScale(20), letterSpacing: -0.3 },
    headerSubtitle: { color: 'rgba(255,255,255,0.6)',  fontWeight: '500', marginTop: 1, fontSize: RESPONSIVE.moderateScale(12) },
    headerIconCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    scrollContent: { flexGrow: 1, paddingBottom: 40 },
    content: { padding: RESPONSIVE.wp(6), width: '100%', maxWidth: 750, alignSelf: 'center' },
    avatarSection: { alignItems: 'center', marginBottom: 30 },
    avatarBox: {
        width: RESPONSIVE.moderateScale(100), height: RESPONSIVE.moderateScale(100), borderRadius: RESPONSIVE.moderateScale(50), padding: 4, 
        ...SHADOWS.medium, marginBottom: 16, position: 'relative'
    },
    avatarGradient: { flex: 1, borderRadius: RESPONSIVE.moderateScale(50), justifyContent: 'center', alignItems: 'center' },
    avatarText: {  fontWeight: '800', color: COLORS.white, fontSize: RESPONSIVE.moderateScale(32) },
    cameraBtn: {
        position: 'absolute', bottom: 0, right: 0, 
        width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.black,
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.white
    },
    userName: {  fontWeight: '800', marginBottom: 4, fontSize: RESPONSIVE.moderateScale(18) },
    userEmail: {  fontWeight: '500', fontSize: RESPONSIVE.moderateScale(14) },
    avatarImage: { width: '100%', height: '100%', borderRadius: RESPONSIVE.moderateScale(50), resizeMode: 'cover' },
    avatarActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    actionBtnText: {
        marginLeft: 6,
        fontWeight: '700',
        fontSize: RESPONSIVE.moderateScale(12),
    },
    uploadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: RESPONSIVE.moderateScale(50),
        justifyContent: 'center',
        alignItems: 'center',
    },
    formCard: {
        borderRadius: 24, padding: RESPONSIVE.wp(5),
        ...SHADOWS.large,
    },
    inputGroup: { marginBottom: 20 },
    label: {  fontWeight: '700', marginBottom: 10, marginLeft: 4, fontSize: RESPONSIVE.moderateScale(13), letterSpacing: 0.5 },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56 },
    input: { flex: 1,  fontWeight: '600', fontSize: RESPONSIVE.moderateScale(14) },
    saveBtn: { marginTop: 10, borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium },
    saveBtnGradient: { height: 58, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { color: COLORS.white,  fontWeight: '800', fontSize: RESPONSIVE.moderateScale(15) },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, marginBottom: 15, borderBottomWidth: 1 },
    sectionTitle: {  fontWeight: '700', fontSize: RESPONSIVE.moderateScale(15), letterSpacing: 0.2 },
    strengthBarContainer: { height: 4, width: '100%', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
    strengthBar: { height: '100%', borderRadius: 2 },
    errorText: { color: COLORS.expense, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 10 },
});

export default ProfileDetailsScreen;
