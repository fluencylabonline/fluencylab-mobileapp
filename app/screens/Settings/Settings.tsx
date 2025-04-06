import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { TextComponent } from '@/components/TextComponent';
import { useTheme } from '@/constants/useTheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import Container from '@/components/ContainerComponent';
import TopBarComponent from '@/components/TopBarComponent';
import { useToast } from '@/components/Toast/useToast';

export default function Settings() {
    const { colors, isDark, theme } = useTheme();
    const { showToast } = useToast();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [notificationTime, setNotificationTime] = useState('09:00');

    const handleThemeChange = () => {
        // Theme change logic will be implemented here
        showToast('Theme settings will be available soon!', 'info');
    };

    const handleNotificationToggle = () => {
        setNotificationsEnabled(!notificationsEnabled);
        showToast(
            notificationsEnabled ? 'Notifications disabled' : 'Notifications enabled',
            notificationsEnabled ? 'info' : 'success'
        );
    };

    const handleNotificationTimeChange = () => {
        // Time picker logic will be implemented here
        showToast('Time picker will be available soon!', 'info');
    };

    const handleProfileEdit = () => {
        // Profile edit logic will be implemented here
        showToast('Profile edit will be available soon!', 'info');
    };

    const handleLanguageChange = () => {
        // Language change logic will be implemented here
        showToast('Language settings will be available soon!', 'info');
    };

    const SettingItem = ({ 
        icon, 
        title, 
        value, 
        onPress, 
        showSwitch = false, 
        showChevron = true 
    }: { 
        icon: string; 
        title: string; 
        value?: string; 
        onPress: () => void; 
        showSwitch?: boolean; 
        showChevron?: boolean;
    }) => (
        <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: colors.cardBackground }]} 
            onPress={onPress}
        >
            <View style={styles.settingItemLeft}>
                <Ionicons name={icon as any} size={24} color={colors.text} />
                <TextComponent style={styles.settingItemTitle}>{title}</TextComponent>
            </View>
            <View style={styles.settingItemRight}>
                {value && <TextComponent style={styles.settingItemValue}>{value}</TextComponent>}
                {showSwitch && (
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={handleNotificationToggle}
                        trackColor={{ false: Colors.indigo.lightest, true: Colors.indigo.default }}
                        thumbColor={isDark ? Colors.background.light : Colors.background.dark}
                    />
                )}
                {showChevron && <Ionicons name="chevron-forward" size={24} color={colors.text} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <Container>
            <TopBarComponent title="Definições" />
            <ScrollView style={styles.container}>
                <View style={styles.section}>
                    <TextComponent weight="bold" size="large" style={styles.sectionTitle}>
                        Perfil
                    </TextComponent>
                    <SettingItem
                        icon="person-outline"
                        title="Edit Profile"
                        onPress={handleProfileEdit}
                    />
                    <SettingItem
                        icon="language-outline"
                        title="Language"
                        value="English"
                        onPress={handleLanguageChange}
                    />
                </View>

                <View style={styles.section}>
                    <TextComponent weight="bold" size="large" style={styles.sectionTitle}>
                        Aparência
                    </TextComponent>
                    <SettingItem
                        icon="moon-outline"
                        title="Theme"
                        value={isDark ? "Dark" : "Light"}
                        onPress={handleThemeChange}
                    />
                </View>

                <View style={styles.section}>
                    <TextComponent weight="bold" size="large" style={styles.sectionTitle}>
                        Notificações
                    </TextComponent>
                    <SettingItem
                        icon="notifications-outline"
                        title="Enable Notifications"
                        onPress={handleNotificationToggle}
                        showSwitch={true}
                        showChevron={false}
                    />
                    <SettingItem
                        icon="time-outline"
                        title="Daily Reminder"
                        value={notificationTime}
                        onPress={handleNotificationTimeChange}
                    />
                </View>
            </ScrollView>
        </Container>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        marginBottom: 16,
        marginLeft: 8,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    settingItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingItemTitle: {
        marginLeft: 12,
    },
    settingItemValue: {
        marginRight: 8,
        opacity: 0.7,
    },
});
