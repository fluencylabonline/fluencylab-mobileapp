import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from "react-native";
import { TextComponent } from "@/components/TextComponent";
import { useTheme } from "@/constants/useTheme";
import { useThemeContext } from "@/constants/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import Container from "@/components/ContainerComponent";
import TopBarComponent from "@/components/TopBarComponent";
import { useToast } from "@/components/Toast/useToast";
import * as Notifications from "expo-notifications";
import { NotificationManager } from "@/utils/notificationManager";
import {
  checkNotificationPermissions,
  requestNotificationPermissions,
} from "@/utils/notificationUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomTimePicker from "./Components/CustomTimePicker";
import ThemePickerModal from "./Components/ThemePickerModal";
import ReminderSettingsModal from "./Components/ReminderSettingsModal";

const STORAGE_KEY = "@studyReminders";

interface ReminderSetting {
  enabled: boolean;
  time: string; // HH:MM format
}

interface DailyRemindersState {
  [key: number]: ReminderSetting;
}

const defaultReminderTime = "12:15";
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
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 7, name: "Sunday" },
];

export default function Settings() {
  const { colors } = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();
  const { showToast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [dailyReminders, setDailyReminders] = useState<DailyRemindersState>(initialDailyReminders);
  const [editingReminderDay, setEditingReminderDay] = useState<number | null>(null);
  const [remindersActive, setRemindersActive] = useState(false);

  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [selectedHours, setSelectedHours] = useState(12);
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);

  useEffect(() => {
    const checkPermissionsAndLoadReminders = async () => {
      const status = await checkNotificationPermissions();
      setNotificationsEnabled(status === "granted");

      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
          const savedReminders: DailyRemindersState = JSON.parse(jsonValue);
          // Optional: Add validation here to ensure the loaded data matches the expected structure
          setDailyReminders(savedReminders);
          console.log("Loaded reminders from storage:", savedReminders);
        } else {
          setDailyReminders(initialDailyReminders);
          console.log("No saved reminders found, using defaults.");
        }
      } catch (e) {
        console.error("Failed to load reminders from storage", e);
        setDailyReminders(initialDailyReminders);
        showToast("Could not load saved reminder settings", "error");
      }

      await updateReminderStatus();
    };

    checkPermissionsAndLoadReminders();
  }, []);

  const updateReminderStatus = useCallback(async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const studyRemindersExist = scheduled.some(
      (n) => n.content.data?.type === "study_reminder"
    );

    const anyEnabled = Object.values(dailyReminders).some((day) => day.enabled);
    setRemindersActive(anyEnabled || studyRemindersExist);
  }, [dailyReminders]);

  useEffect(() => {
    updateReminderStatus();
  }, [dailyReminders, updateReminderStatus]);

  const handleThemeChange = () => {
    setIsThemeModalVisible(true);
  };

  const handleThemeSelect = async (mode: any) => {
    setThemeMode(mode);
    setIsThemeModalVisible(false);
    showToast(`Theme set to ${mode} mode`, "success");
  };

  const getThemeDisplayValue = () => {
    switch (themeMode) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
      default:
        return "System";
    }
  };

  const handleNotificationToggle = async () => {
    const newStatus = !notificationsEnabled;

    if (newStatus) {
      const status = await checkNotificationPermissions();
      if (status !== "granted") {
        const { status: newStatusPerm } =
          await requestNotificationPermissions();
        if (newStatusPerm !== "granted") {
          Alert.alert(
            "Permission Required",
            "To receive notifications, you need to enable notification permissions in your device settings.",
            [{ text: "OK" }]
          );
          return;
        }
      }
      setNotificationsEnabled(true);
      showToast("Notifications enabled", "success");
    } else {
      setNotificationsEnabled(false);
      await cancelAllStudyReminders();
      showToast("Notifications disabled", "info");
    }
  };

  const handleDailyReminderPress = () => {
    if (!notificationsEnabled) {
      showToast("Enable notifications first", "error");
      return;
    }
    setIsReminderModalVisible(true);
  };

  const handleDayReminderToggle = (dayId: number, value: boolean) => {
    setDailyReminders((prev) => ({
      ...prev,
      [dayId]: { ...prev[dayId], enabled: value },
    }));
  };

  const handleDayTimePress = (dayId: number) => {
    const [hours, minutes] = dailyReminders[dayId].time.split(":").map(Number);
    setSelectedHours(hours);
    setSelectedMinutes(minutes);
    setEditingReminderDay(dayId);
    setIsTimePickerVisible(true);
  };

  const handleTimeConfirm = () => {
    if (editingReminderDay === null) return;

    const hours = selectedHours.toString().padStart(2, "0");
    const minutes = selectedMinutes.toString().padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;

    setDailyReminders((prev) => ({
      ...prev,
      [editingReminderDay]: {
        ...prev[editingReminderDay],
        time: formattedTime,
        enabled: true,
      },
    }));

    setIsTimePickerVisible(false);
    setEditingReminderDay(null);
  };

  const handleTimeCancel = () => {
    setIsTimePickerVisible(false);
    setEditingReminderDay(null);
  };

  const adjustHours = (increment: boolean) => {
    setSelectedHours((prev) => {
      let newHours = increment ? prev + 1 : prev - 1;
      if (newHours > 23) newHours = 0;
      if (newHours < 0) newHours = 23;
      return newHours;
    });
  };

  const adjustMinutes = (increment: boolean) => {
    setSelectedMinutes((prev) => {
      let newMinutes = increment ? prev + 1 : prev - 1;
      if (newMinutes > 59) newMinutes = 0;
      if (newMinutes < 0) newMinutes = 59;
      return newMinutes;
    });
  };

  const cancelAllStudyReminders = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    let cancelledCount = 0;
    for (const notification of scheduled) {
      if (notification.content.data?.type === "study_reminder") {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
        cancelledCount++;
      }
    }
    console.log(`Cancelled ${cancelledCount} study reminders.`);
    await updateReminderStatus();
  };

  const handleSaveReminders = async () => {
    await cancelAllStudyReminders();

    let scheduledCount = 0;
    for (const day of weekDays) {
      const reminderSetting = dailyReminders[day.id];
      if (reminderSetting.enabled) {
        try {
          const time = NotificationManager.parseTimeString(
            reminderSetting.time
          );
          if (!time) {
            console.error(
              `Failed to parse time string: ${reminderSetting.time}`
            );
            continue;
          }
          const { hour, minute } = time;
          await NotificationManager.scheduleWeeklyNotification(
            "Lembrete!", // Title
            `Hora de estudar! (${day.name})`, // Body
            day.id, // Weekday (1-7)
            hour,
            minute,
            { type: "study_reminder", dayOfWeek: day.id } // Data payload
          );
          scheduledCount++;
        } catch (error) {
          console.error(`Failed to schedule reminder for ${day.name}:`, error);
          showToast(`Failed to schedule reminder for ${day.name}`, "error");
        }
      }
    }

    try {
      const jsonValue = JSON.stringify(dailyReminders);
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
      console.log("Saved reminders to storage:", dailyReminders);
    } catch (e) {
      console.error("Failed to save reminders to storage", e);
      showToast("Failed to save reminder settings", "error");
    }

    setIsReminderModalVisible(false);
    if (scheduledCount > 0) {
      showToast(`Saved ${scheduledCount} study reminder(s)`, "success");
    } else {
      showToast("All study reminders are off", "info");
    }
    await updateReminderStatus();
  };

  const handleCancelReminders = () => {
    setIsReminderModalVisible(false);
  };

  const handleProfileEdit = () => {
    showToast("Profile edit will be available soon!", "info");
  };

  const handleLanguageChange = () => {
    showToast("Language settings will be available soon!", "info");
  };

  const SettingItem = ({
    icon,
    title,
    value,
    onPress,
    showSwitch = false,
    showChevron = true,
    disabled = false,
    isActive = false,
    switchValue = null,
    onSwitchChange = null,
  }: {
    icon: string;
    title: string;
    value?: string;
    onPress: () => void;
    showSwitch?: boolean;
    showChevron?: boolean;
    disabled?: boolean;
    isActive?: boolean;
    switchValue?: boolean | null;
    onSwitchChange?: ((value: boolean) => void) | null;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        { backgroundColor: colors.cards.primary },
        disabled ? { opacity: 0.7 } : {},
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
              <View
                style={[
                  styles.activeDot,
                  { backgroundColor: colors.colors.teal },
                ]}
              />
            )}
            <TextComponent style={styles.settingItemValue}>
              {value}
            </TextComponent>
          </View>
        )}
        {showSwitch && (
          <Switch
            value={switchValue !== null ? switchValue : notificationsEnabled}
            onValueChange={
              onSwitchChange !== null
                ? onSwitchChange
                : handleNotificationToggle
            }
            trackColor={{ false: "#767577", true: colors.colors.indigo }}
            thumbColor={colors.background.primary}
          />
        )}
        {showChevron && !showSwitch && (
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.text.primary}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const reminderDisplayValue = remindersActive ? "Personalizado" : "Desligado";

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
            title="Editar perfil"
            onPress={handleProfileEdit}
          />
          <SettingItem
            icon="language-outline"
            title="Idioma"
            value="Inglês"
            onPress={handleLanguageChange}
          />
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <TextComponent weight="bold" size="large" style={styles.sectionTitle}>
            Aparência
          </TextComponent>
          <SettingItem
            icon="color-palette-outline"
            title="Tema"
            value={getThemeDisplayValue()}
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
            title="Ativar notificações"
            onPress={handleNotificationToggle}
            showSwitch={true}
            showChevron={false}
            switchValue={notificationsEnabled}
            onSwitchChange={handleNotificationToggle}
          />
          <SettingItem
            icon="time-outline"
            title="Lembretes para estudar"
            value={reminderDisplayValue}
            onPress={handleDailyReminderPress}
            disabled={!notificationsEnabled}
            isActive={remindersActive} 
          />
        </View>
      </ScrollView>

      {/* Use the ThemePickerModal component */}
        <ThemePickerModal
            visible={isThemeModalVisible}
            currentTheme={themeMode}
            onCancel={() => setIsThemeModalVisible(false)}
            onThemeSelect={handleThemeSelect}
        />

      {/* --- Enhanced Reminder Settings Modal --- */}
        <ReminderSettingsModal
            visible={isReminderModalVisible}
            dailyReminders={dailyReminders}
            onCancel={handleCancelReminders}
            onSave={handleSaveReminders}
            onDayReminderToggle={handleDayReminderToggle}
            onDayTimePress={handleDayTimePress}
            weekDays={weekDays}
        />

        <CustomTimePicker
            visible={isTimePickerVisible}
            selectedHours={selectedHours}
            selectedMinutes={selectedMinutes}
            onCancel={handleTimeCancel}
            onConfirm={handleTimeConfirm}
            onHourChange={adjustHours}
            onMinuteChange={adjustMinutes}
        />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    minHeight: 60,
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  settingItemRight: {
    flexDirection: "row",
    alignItems: "center",
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
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});