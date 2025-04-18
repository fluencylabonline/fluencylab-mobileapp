import React from "react";
import { Modal, View, StyleSheet, TouchableOpacity, Button, ScrollView, Switch, Dimensions, Pressable } from "react-native";
import { TextComponent } from "@/components/TextComponent";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/constants/useTheme";
import ButtonComponent from "@/components/ButtonComponent";

// Define structure for daily reminders
interface ReminderSetting {
  enabled: boolean;
  time: string; // HH:MM format
}

interface DailyRemindersState {
  [key: number]: ReminderSetting; // 1: Monday, 2: Tuesday, ..., 7: Sunday
}

interface ReminderSettingsModalProps {
  visible: boolean;
  dailyReminders: DailyRemindersState;
  onCancel: () => void;
  onSave: () => void;
  onDayReminderToggle: (dayId: number, value: boolean) => void;
  onDayTimePress: (dayId: number) => void;
  weekDays: Array<{ id: number; name: string }>;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ReminderSettingsModal({
  visible,
  dailyReminders,
  onCancel,
  onSave,
  onDayReminderToggle,
  onDayTimePress,
  weekDays,
}: ReminderSettingsModalProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  // Enhanced rendering for time display with clearer indication
  const renderTimeDisplay = (dayId: number) => {
    const { time, enabled } = dailyReminders[dayId];
    return (
      <TouchableOpacity
        onPress={() => onDayTimePress(dayId)}
        style={[
          styles.timeDisplayContainer,
          {
            backgroundColor: enabled
              ? colors.colors.indigo + "20"
              : "transparent",
            borderColor: enabled
              ? colors.colors.indigo
              : colors.text.secondary + "50",
          },
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
            { color: enabled ? colors.text.primary : colors.text.secondary },
          ]}
        >
          {time}
        </TextComponent>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel} 
    >
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.bottomSheet.background },
          ]}
        >
          <View style={styles.modalHeader}>
            <TextComponent
              weight="bold"
              size="large"
              style={styles.modalTitle}
            >
              Lembretes de estudo
            </TextComponent>
            <TextComponent style={styles.modalSubtitle}>
              Clique no horário de cada dia para ajustar
            </TextComponent>
          </View>

          <ScrollView style={styles.daysList}>
            {weekDays.map((day) => (
              <View
                key={day.id}
                style={[
                  styles.daySettingItem,
                  { borderBottomColor: colors.text.secondary + "30" },
                ]}
              >
                <View style={styles.dayNameContainer}>
                  <TextComponent weight="bold" style={styles.dayName}>
                    {day.name}
                  </TextComponent>
                </View>

                <View style={styles.dayControls}>
                  {renderTimeDisplay(day.id)}

                  <Switch
                    value={dailyReminders[day.id].enabled}
                    onValueChange={(value) =>
                      onDayReminderToggle(day.id, value)
                    }
                    trackColor={{
                      false: "#767577",
                      true: colors.colors.indigo,
                    }}
                    thumbColor={colors.background.primary}
                    ios_backgroundColor="#3e3e3e"
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[ styles.modalActions]}>
            <ButtonComponent
              title="Cancelar"
              onPress={onCancel}
              color="deepOrangeLight"
            />
            <ButtonComponent
              title="Salvar"
              onPress={onSave}
              color="tealLight"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({  
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalOverlay.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.70,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 22
  },
  modalHeader: {
    marginBottom: 15,
  },
  modalTitle: {
    textAlign: "center",
    fontSize: 20,
    marginBottom: 8,
  },
  modalSubtitle: {
    textAlign: "center",
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 10,
  },
  daysList: {
  },
  daySettingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 6,
  },
  dayNameContainer: {
    flex: 1,
  },
  dayName: {
    fontSize: 16
  },
  dayControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeDisplayContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 15,
    paddingTop: 15,
  },
});