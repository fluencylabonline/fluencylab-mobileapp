import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Platform, Modal, Button, Text } from 'react-native';
import { TextComponent } from '@/components/TextComponent';
import { useTheme } from '@/constants/useTheme';
import { Ionicons } from '@expo/vector-icons';
import Container from '@/components/ContainerComponent';
import TopBarComponent from '@/components/TopBarComponent';
import { useToast } from '@/components/Toast/useToast';
import * as Notifications from 'expo-notifications';
import { NotificationManager } from '@/utils/notificationManager';
import { checkNotificationPermissions, requestNotificationPermissions } from '@/utils/notificationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <--- Add this import

const STORAGE_KEY = '@studyReminders';

// --- Define structure for daily reminders ---
interface ReminderSetting {
    enabled: boolean;
    time: string; // HH:MM format
}

interface DailyRemindersState {
    [key: number]: ReminderSetting; // 1: Monday, 2: Tuesday, ..., 7: Sunday
}

const defaultReminderTime = '16:51';
const initialDailyReminders: DailyRemindersState = {
    1: { enabled: false, time: defaultReminderTime }, // Monday
    2: { enabled: false, time: defaultReminderTime }, // Tuesday
    3: { enabled: false, time: defaultReminderTime }, // Wednesday
    4: { enabled: false, time: defaultReminderTime }, // Thursday
    5: { enabled: false, time: defaultReminderTime }, // Friday
    6: { enabled: false, time: defaultReminderTime }, // Saturday
    7: { enabled: false, time: defaultReminderTime }, // Sunday
};

const weekDays = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' },
    { id: 7, name: 'Sunday' },
];
// --- End Reminder Structure ---

export default function Settings() {
    const { colors } = useTheme();
    const { showToast } = useToast();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    // --- State for Daily Reminders ---
    const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
    const [dailyReminders, setDailyReminders] = useState<DailyRemindersState>(initialDailyReminders);
    const [editingReminderDay, setEditingReminderDay] = useState<number | null>(null); // Track which day's time is being set
    const [remindersActive, setRemindersActive] = useState(false); // To show overall status
    
    // --- Custom Time Picker State ---
    const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
    const [selectedHours, setSelectedHours] = useState(16); // Default to 16:51
    const [selectedMinutes, setSelectedMinutes] = useState(51);
    // --- End Custom Time Picker State ---

    // Check permissions and load existing reminders on mount
    useEffect(() => {
        const checkPermissionsAndLoadReminders = async () => {
            const status = await checkNotificationPermissions();
            setNotificationsEnabled(status === 'granted');

            try {
                const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
                if (jsonValue != null) {
                    const savedReminders: DailyRemindersState = JSON.parse(jsonValue);
                    // Optional: Add validation here to ensure the loaded data matches the expected structure
                    setDailyReminders(savedReminders);
                    console.log("Loaded reminders from storage:", savedReminders);
                } else {
                    // No saved data, use initial state
                    setDailyReminders(initialDailyReminders);
                    console.log("No saved reminders found, using defaults.");
                }
            } catch (e) {
                console.error("Failed to load reminders from storage", e);
                // Fallback to initial state in case of error
                setDailyReminders(initialDailyReminders);
                showToast("Could not load saved reminder settings", "error");
            }
            
            await updateReminderStatus();
        };

        checkPermissionsAndLoadReminders();
    }, []);

    // Update the overall reminder status indicator
    const updateReminderStatus = useCallback(async () => {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const studyRemindersExist = scheduled.some(n => n.content.data?.type === 'study_reminder');
        
        // Also update based on local state for immediate UI feedback
        const anyEnabled = Object.values(dailyReminders).some(day => day.enabled);
        setRemindersActive(anyEnabled || studyRemindersExist);
    }, [dailyReminders]);

    useEffect(() => {
        updateReminderStatus();
    }, [dailyReminders, updateReminderStatus]);

    const handleThemeChange = () => {
        showToast('Theme settings will be available soon!', 'info');
    };

    const handleNotificationToggle = async () => {
        const newStatus = !notificationsEnabled;

        if (newStatus) {
            const status = await checkNotificationPermissions();
            if (status !== 'granted') {
                const { status: newStatusPerm } = await requestNotificationPermissions();
                if (newStatusPerm !== 'granted') {
                    Alert.alert(
                        "Permission Required",
                        "To receive notifications, you need to enable notification permissions in your device settings.",
                        [{ text: "OK" }]
                    );
                    return;
                }
            }
            setNotificationsEnabled(true);
            showToast('Notifications enabled', 'success');
        } else {
            setNotificationsEnabled(false);
            // Cancel study reminders when notifications are globally disabled
            await cancelAllStudyReminders();
            showToast('Notifications disabled', 'info');
        }
    };

    // Opens the Modal
    const handleDailyReminderPress = () => {
        if (!notificationsEnabled) {
            showToast('Enable notifications first', 'error');
            return;
        }
        setIsReminderModalVisible(true);
    };

    // Toggle a specific day's reminder setting
    const handleDayReminderToggle = (dayId: number, value: boolean) => {
        setDailyReminders(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], enabled: value },
        }));
    };

    // Handle pressing the time to open custom time picker for a specific day
    const handleDayTimePress = (dayId: number) => {
        // Set the current time values before opening the picker
        const [hours, minutes] = dailyReminders[dayId].time.split(':').map(Number);
        setSelectedHours(hours);
        setSelectedMinutes(minutes);
        setEditingReminderDay(dayId);
        setIsTimePickerVisible(true);
    };
    
    // Handle confirm from custom time picker
    const handleTimeConfirm = () => {
        if (editingReminderDay === null) return;
        
        const hours = selectedHours.toString().padStart(2, '0');
        const minutes = selectedMinutes.toString().padStart(2, '0');
        const formattedTime = `${hours}:${minutes}`;

        setDailyReminders(prev => ({
            ...prev,
            [editingReminderDay]: { 
                ...prev[editingReminderDay], 
                time: formattedTime,
                enabled: true // Auto-enable the day when a time is selected
            },
        }));
        
        setIsTimePickerVisible(false);
        setEditingReminderDay(null);
    };

    // Handle cancel from custom time picker
    const handleTimeCancel = () => {
        setIsTimePickerVisible(false);
        setEditingReminderDay(null);
    };

    // Adjust hours up or down
    const adjustHours = (increment: boolean) => {
        setSelectedHours(prev => {
            let newHours = increment ? prev + 1 : prev - 1;
            if (newHours > 23) newHours = 0;
            if (newHours < 0) newHours = 23;
            return newHours;
        });
    };

    // Adjust minutes up or down
    const adjustMinutes = (increment: boolean) => {
        setSelectedMinutes(prev => {
            let newMinutes = increment ? prev + 1 : prev - 1;
            if (newMinutes > 59) newMinutes = 0;
            if (newMinutes < 0) newMinutes = 59;
            return newMinutes;
        });
    };

    // Cancel all existing study reminders
    const cancelAllStudyReminders = async () => {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        let cancelledCount = 0;
        for (const notification of scheduled) {
            if (notification.content.data?.type === 'study_reminder') {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                cancelledCount++;
            }
        }
        console.log(`Cancelled ${cancelledCount} study reminders.`);
        await updateReminderStatus(); // Update UI status
    };

    // Save reminders and schedule notifications
    const handleSaveReminders = async () => {
        // 1. Cancel all previous study reminders
        await cancelAllStudyReminders();

        // 2. Schedule new weekly reminders for enabled days
        let scheduledCount = 0;
        for (const day of weekDays) {
            const reminderSetting = dailyReminders[day.id];
            if (reminderSetting.enabled) {
                try {
                    const time = NotificationManager.parseTimeString(reminderSetting.time);
                    if (!time) {
                        console.error(`Failed to parse time string: ${reminderSetting.time}`);
                        continue;
                    }
                    const { hour, minute } = time;
                    await NotificationManager.scheduleWeeklyNotification(
                        'Study Reminder', // Title
                        `Time to study! (${day.name})`, // Body
                        day.id, // Weekday (1-7)
                        hour,
                        minute,
                        { type: 'study_reminder', dayOfWeek: day.id } // Data payload
                    );
                    scheduledCount++;
                } catch (error) {
                    console.error(`Failed to schedule reminder for ${day.name}:`, error);
                    showToast(`Failed to schedule reminder for ${day.name}`, 'error');
                }
            }
        }

        // --- Persist Saved Reminders ---
        try {
            const jsonValue = JSON.stringify(dailyReminders);
            await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
            console.log("Saved reminders to storage:", dailyReminders);
        } catch (e) {
            console.error("Failed to save reminders to storage", e);
            showToast("Failed to save reminder settings", "error");
        }
        // --- End Persist ---

        setIsReminderModalVisible(false);
        if (scheduledCount > 0) {
            showToast(`Saved ${scheduledCount} study reminder(s)`, 'success');
        } else {
            showToast('All study reminders are off', 'info');
        }
        await updateReminderStatus(); // Update overall status indicator
    };

    // Cancel without saving changes
    const handleCancelReminders = () => {
        setIsReminderModalVisible(false);
    };

    const handleProfileEdit = () => {
        showToast('Profile edit will be available soon!', 'info');
    };

    const handleLanguageChange = () => {
        showToast('Language settings will be available soon!', 'info');
    };

    const sendTestNotification = async () => {
        if (!notificationsEnabled) {
            showToast('Enable notifications first', 'error');
            return;
        }
        try {
            await NotificationManager.sendImmediateNotification(
                'Test Notification',
                'This is a test notification from your app!',
                { test: true }
            );
            showToast('Test notification sent!', 'success');
        } catch (error) {
            console.error('Failed to send notification:', error);
            showToast('Failed to send notification', 'error');
        }
    };

    // --- SettingItem Component ---
    const SettingItem = ({
        icon,
        title,
        value,
        onPress,
        showSwitch = false,
        showChevron = true,
        disabled = false,
        isActive = false,
    }: {
        icon: string;
        title: string;
        value?: string;
        onPress: () => void;
        showSwitch?: boolean;
        showChevron?: boolean;
        disabled?: boolean;
        isActive?: boolean;
    }) => (
        <TouchableOpacity
            style={[
                styles.settingItem,
                { backgroundColor: colors.cards.primary },
                disabled ? { opacity: 0.7 } : {}
            ]}
            onPress={onPress}
            disabled={disabled}
        >
            <View style={styles.settingItemLeft}>
                <Ionicons name={icon as any} size={24} color={colors.text.primary} />
                <TextComponent style={styles.settingItemTitle}>{title}</TextComponent>
            </View>
            <View style={styles.settingItemRight}>
                {value && (
                    <View style={styles.valueContainer}>
                        {isActive && (
                            <View style={[styles.activeDot, { backgroundColor: colors.colors.teal }]} />
                        )}
                        <TextComponent style={styles.settingItemValue}>{value}</TextComponent>
                    </View>
                )}
                {showSwitch && (
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={handleNotificationToggle}
                        trackColor={{ false: '#767577', true: colors.colors.indigo }}
                        thumbColor={colors.background.primary}
                    />
                )}
                {showChevron && !showSwitch && <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />}
            </View>
        </TouchableOpacity>
    );
    // --- End SettingItem ---

    // Determine the value to display for Daily Reminder setting
    const reminderDisplayValue = remindersActive ? "Custom" : "Off";

    // Enhanced rendering for time display with clearer indication
    const renderTimeDisplay = (dayId: number) => {
        const { time, enabled } = dailyReminders[dayId];
        return (
            <TouchableOpacity
                onPress={() => handleDayTimePress(dayId)}
                style={[
                    styles.timeDisplayContainer,
                    { 
                        backgroundColor: enabled ? colors.colors.indigo + '20' : 'transparent',
                        borderColor: enabled ? colors.colors.indigo : colors.text.secondary + '50',
                    }
                ]}
            >
                <Ionicons 
                    name="time-outline" 
                    size={16} 
                    color={enabled ? colors.colors.indigo : colors.text.secondary} 
                    style={styles.timeIcon}
                />
                <TextComponent
                    style={[
                        styles.dayTime,
                        { color: enabled ? colors.text.primary : colors.text.secondary }
                    ]}
                >
                    {time}
                </TextComponent>
            </TouchableOpacity>
        );
    };

    return (
        <Container>
            <TopBarComponent title="Definições" />
            <ScrollView style={styles.container}>
                {/* Profile Section */}
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
                        value="English" // This should likely come from state/context
                        onPress={handleLanguageChange}
                    />
                </View>

                {/* Appearance Section */}
                <View style={styles.section}>
                    <TextComponent weight="bold" size="large" style={styles.sectionTitle}>
                        Aparência
                    </TextComponent>
                    <SettingItem
                        icon="moon-outline"
                        title="Theme"
                        value="Light" // This should likely come from state/context
                        onPress={handleThemeChange}
                    />
                </View>

                {/* Notifications Section */}
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
                        title="Daily Study Reminder"
                        value={reminderDisplayValue} // Show 'Custom' or 'Off'
                        onPress={handleDailyReminderPress} // Opens modal
                        disabled={!notificationsEnabled}
                        isActive={remindersActive} // Show dot if any reminder is active
                    />

                    {/* Test notification button */}
                    <TouchableOpacity
                        style={[
                            styles.testNotificationButton,
                            {
                                backgroundColor: notificationsEnabled ? colors.colors.indigo : '#cccccc',
                                opacity: notificationsEnabled ? 1 : 0.7
                            }
                        ]}
                        onPress={sendTestNotification}
                        disabled={!notificationsEnabled}
                    >
                        <Ionicons name="notifications" size={20} color="#FFFFFF" />
                        <TextComponent style={styles.buttonText}>Send Test Notification</TextComponent>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* --- Enhanced Reminder Settings Modal --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isReminderModalVisible}
                onRequestClose={handleCancelReminders}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: colors.background.primary }]}>
                        <View style={styles.modalHeader}>
                            <TextComponent weight="bold" size="large" style={styles.modalTitle}>
                                Set Study Reminders
                            </TextComponent>
                            <TextComponent style={styles.modalSubtitle}>
                                Tap on time to change each day's notification time
                            </TextComponent>
                        </View>

                        <ScrollView style={styles.daysList}>
                            {weekDays.map((day) => (
                                <View key={day.id} style={[styles.daySettingItem, { borderBottomColor: colors.text.secondary + '30' }]}>
                                    <View style={styles.dayNameContainer}>
                                        <TextComponent weight="bold" style={styles.dayName}>
                                            {day.name}
                                        </TextComponent>
                                    </View>
                                    
                                    <View style={styles.dayControls}>
                                        {renderTimeDisplay(day.id)}
                                        
                                        <Switch
                                            value={dailyReminders[day.id].enabled}
                                            onValueChange={(value) => handleDayReminderToggle(day.id, value)}
                                            trackColor={{ false: '#767577', true: colors.colors.indigo }}
                                            thumbColor={colors.background.primary}
                                            ios_backgroundColor="#3e3e3e"
                                        />
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                        
                        <View style={[styles.modalActions, { borderTopColor: colors.text.secondary + '30' }]}>
                            <Button 
                                title="Cancel" 
                                onPress={handleCancelReminders} 
                                color={colors.text.secondary} 
                            />
                            <View style={{width: 20}}/>{/* Spacer */}
                            <Button 
                                title="Save Reminders" 
                                onPress={handleSaveReminders} 
                                color={colors.colors.indigo} 
                            />
                        </View>
                    </View>
                </View>
            </Modal>
            {/* --- End Enhanced Reminder Modal --- */}

            {/* --- Custom Time Picker Modal --- */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isTimePickerVisible}
                onRequestClose={handleTimeCancel}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.timePickerContainer, { backgroundColor: colors.background.primary }]}>
                        <View style={styles.timePickerHeader}>
                            <TextComponent weight="bold" size="large" style={styles.timePickerTitle}>
                                Set Time
                            </TextComponent>
                        </View>
                        
                        <View style={styles.timePickerContent}>
                            {/* Hours Column */}
                            <View style={styles.timeColumn}>
                                <TouchableOpacity 
                                    style={styles.timeButton}
                                    onPress={() => adjustHours(true)}
                                >
                                    <Ionicons name="chevron-up" size={24} color={colors.colors.indigo} />
                                </TouchableOpacity>
                                
                                <View style={[styles.timeValue, { backgroundColor: colors.colors.indigo + '20' }]}>
                                    <TextComponent style={[styles.timeValueText, { color: colors.text.primary }]}>
                                        {selectedHours.toString().padStart(2, '0')}
                                    </TextComponent>
                                </View>
                                
                                <TouchableOpacity 
                                    style={styles.timeButton}
                                    onPress={() => adjustHours(false)}
                                >
                                    <Ionicons name="chevron-down" size={24} color={colors.colors.indigo} />
                                </TouchableOpacity>
                            </View>
                            
                            {/* Separator */}
                            <TextComponent style={[styles.timeColon, { color: colors.text.primary }]}>
                                :
                            </TextComponent>
                            
                            {/* Minutes Column */}
                            <View style={styles.timeColumn}>
                                <TouchableOpacity 
                                    style={styles.timeButton}
                                    onPress={() => adjustMinutes(true)}
                                >
                                    <Ionicons name="chevron-up" size={24} color={colors.colors.indigo} />
                                </TouchableOpacity>
                                
                                <View style={[styles.timeValue, { backgroundColor: colors.colors.indigo + '20' }]}>
                                    <TextComponent style={[styles.timeValueText, { color: colors.text.primary }]}>
                                        {selectedMinutes.toString().padStart(2, '0')}
                                    </TextComponent>
                                </View>
                                
                                <TouchableOpacity 
                                    style={styles.timeButton}
                                    onPress={() => adjustMinutes(false)}
                                >
                                    <Ionicons name="chevron-down" size={24} color={colors.colors.indigo} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <View style={styles.timePickerActions}>
                            <Button
                                title="Cancel"
                                onPress={handleTimeCancel}
                                color={colors.text.secondary}
                            />
                            <View style={{width: 30}} />
                            <Button
                                title="Confirm"
                                onPress={handleTimeConfirm}
                                color={colors.colors.indigo}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
            {/* --- End Custom Time Picker Modal --- */}
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
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 8,
        minHeight: 60,
    },
    settingItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    settingItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    },
    settingItemTitle: {
        marginLeft: 12,
        fontSize: 16,
    },
    settingItemValue: {
        marginRight: 8,
        opacity: 0.7,
        fontSize: 15,
    },
    testNotificationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        marginTop: 16,
    },
    buttonText: {
        color: '#FFFFFF',
        marginLeft: 8,
        fontWeight: '600',
        fontSize: 15,
    },
    valueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    // --- Enhanced Modal Styles ---
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: 15,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalHeader: {
        marginBottom: 15,
    },
    modalTitle: {
        textAlign: 'center',
        fontSize: 20,
        marginBottom: 8,
    },
    modalSubtitle: {
        textAlign: 'center',
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 10,
    },
    daysList: {
        maxHeight: 400,
    },
    daySettingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    dayNameContainer: {
        flex: 1,
        paddingLeft: 5,
    },
    dayName: {
        fontSize: 16,
    },
    dayControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeDisplayContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        marginRight: 15,
    },
    timeIcon: {
        marginRight: 5,
    },
    dayTime: {
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 25,
        paddingTop: 15,
        borderTopWidth: 1,
    },
    // --- End Modal Styles ---
    
    // --- Custom Time Picker Styles ---
    timePickerContainer: {
        width: '80%',
        borderRadius: 15,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    timePickerHeader: {
        marginBottom: 20,
    },
    timePickerTitle: {
        textAlign: 'center',
        fontSize: 20,
    },
    timePickerContent: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    timeColumn: {
        alignItems: 'center',
    },
    timeButton: {
        padding: 10,
    },
    timeValue: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        margin: 10,
    },
    timeValueText: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    timeColon: {
        fontSize: 30,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    timePickerActions: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    // --- End Custom Time Picker Styles ---
});