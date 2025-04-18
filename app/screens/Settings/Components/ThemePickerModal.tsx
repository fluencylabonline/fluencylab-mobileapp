import React from "react";
import { Modal, View, TouchableOpacity, Button, StyleSheet, Dimensions, Pressable } from "react-native";
import { TextComponent } from "@/components/TextComponent";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/constants/useTheme";

interface ThemePickerModalProps {
  visible: boolean;
  currentTheme: string;
  onCancel: () => void;
  onThemeSelect: (theme: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ThemePickerModal({
  visible,
  currentTheme,
  onCancel,
  onThemeSelect,
}: ThemePickerModalProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

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
            <TextComponent weight="bold" size="large" style={styles.modalTitle}>
              Escolher tema
            </TextComponent>
          </View>

          <View style={{ gap: 8, marginHorizontal: 22 }}>
            <TouchableOpacity
              style={[
                {
                  backgroundColor: colors.background.listSecondary,
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 6,
                  paddingVertical: 16,
                  gap: 12,
                  borderRadius: 8,
                },
                currentTheme === "light" && {
                  borderColor: colors.colors.darkGray,
                  borderWidth: 3,
                },
              ]}
              onPress={() => onThemeSelect("light")}
            >
              <Ionicons
                name="sunny-outline"
                size={24}
                color={colors.text.primary}
              />
              <TextComponent>Light</TextComponent>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                {
                  backgroundColor: colors.background.listSecondary,
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 6,
                  paddingVertical: 16,
                  gap: 12,
                  borderRadius: 8,
                },
                currentTheme === "dark" && {
                  borderColor: colors.colors.darkGray,
                  borderWidth: 3,
                },
              ]}
              onPress={() => onThemeSelect("dark")}
            >
              <Ionicons
                name="moon-outline"
                size={24}
                color={colors.text.primary}
              />
              <TextComponent>Dark</TextComponent>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                {
                  backgroundColor: colors.background.listSecondary,
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 6,
                  paddingVertical: 16,
                  gap: 12,
                  borderRadius: 8,
                },
                currentTheme === "system" && {
                  borderColor: colors.colors.darkGray,
                  borderWidth: 3,
                },
              ]}
              onPress={() => onThemeSelect("system")}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={colors.text.primary}
              />
              <TextComponent>Sistema</TextComponent>
            </TouchableOpacity>
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
    backgroundColor: colors.modalOverlay.primary,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.50,
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
    color: colors.colors.text
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 25,
    paddingTop: 15,
  },
});