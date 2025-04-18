import React from "react";
import { Modal, View, TouchableOpacity, Button, StyleSheet } from "react-native";
import { TextComponent } from "@/components/TextComponent";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/constants/useTheme";

interface CustomTimePickerProps {
  visible: boolean;
  selectedHours: number;
  selectedMinutes: number;
  onCancel: () => void;
  onConfirm: () => void;
  onHourChange: (increment: boolean) => void;
  onMinuteChange: (increment: boolean) => void;
}

export default function CustomTimePicker({
  visible,
  selectedHours,
  selectedMinutes,
  onCancel,
  onConfirm,
  onHourChange,
  onMinuteChange,
}: CustomTimePickerProps) {
  const { colors } = useTheme();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.timePickerContainer,
            { backgroundColor: colors.background.primary },
          ]}
        >
          <View style={styles.timePickerHeader}>
            <TextComponent
              weight="bold"
              size="large"
              style={styles.timePickerTitle}
            >
              Set Time
            </TextComponent>
          </View>

          <View style={styles.timePickerContent}>
            {/* Hours Column */}
            <View style={styles.timeColumn}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => onHourChange(true)}
              >
                <Ionicons
                  name="chevron-up"
                  size={24}
                  color={colors.colors.indigo}
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.timeValue,
                  { backgroundColor: colors.colors.indigo + "20" },
                ]}
              >
                <TextComponent
                  style={[styles.timeValueText, { color: colors.text.primary }]}
                >
                  {selectedHours.toString().padStart(2, "0")}
                </TextComponent>
              </View>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => onHourChange(false)}
              >
                <Ionicons
                  name="chevron-down"
                  size={24}
                  color={colors.colors.indigo}
                />
              </TouchableOpacity>
            </View>

            {/* Separator */}
            <TextComponent
              style={[styles.timeColon, { color: colors.text.primary }]}
            >
              :
            </TextComponent>

            {/* Minutes Column */}
            <View style={styles.timeColumn}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => onMinuteChange(true)}
              >
                <Ionicons
                  name="chevron-up"
                  size={24}
                  color={colors.colors.indigo}
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.timeValue,
                  { backgroundColor: colors.colors.indigo + "20" },
                ]}
              >
                <TextComponent
                  style={[styles.timeValueText, { color: colors.text.primary }]}
                >
                  {selectedMinutes.toString().padStart(2, "0")}
                </TextComponent>
              </View>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => onMinuteChange(false)}
              >
                <Ionicons
                  name="chevron-down"
                  size={24}
                  color={colors.colors.indigo}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.timePickerActions}>
            <Button
              title="Cancel"
              onPress={onCancel}
              color={colors.text.secondary}
            />
            <View style={{ width: 30 }} />
            <Button
              title="Confirm"
              onPress={onConfirm}
              color={colors.colors.indigo}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  timePickerContainer: {
    width: "80%",
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  timePickerHeader: {
    marginBottom: 20,
  },
  timePickerTitle: {
    textAlign: "center",
    fontSize: 20,
  },
  timePickerContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  timeColumn: {
    alignItems: "center",
  },
  timeButton: {
    padding: 10,
  },
  timeValue: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    margin: 10,
  },
  timeValueText: {
    fontSize: 28,
    fontWeight: "bold",
  },
  timeColon: {
    fontSize: 30,
    fontWeight: "bold",
    marginHorizontal: 10,
  },
  timePickerActions: {
    flexDirection: "row",
    justifyContent: "center",
  },
});