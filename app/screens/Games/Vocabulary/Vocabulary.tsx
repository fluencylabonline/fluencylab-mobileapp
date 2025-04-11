import React from "react";

import { useTheme } from "@/constants/useTheme"; // Adjust path as needed
import ShowGames from "@/app/screens/Games/Vocabulary/Components/ShowGames";
import TopBarComponent from "@/components/TopBarComponent";
import { Ionicons } from "@expo/vector-icons";
import Container from "@/components/ContainerComponent";

interface VocabularyProps {
  onClose: () => void;
}

export default function Vocabulary({ onClose }: VocabularyProps) {
  const { colors } = useTheme();

  const handleBack = () => {
    onClose();
  };

  const openInstructionsSheet = () => {
    console.log("openInstructionsSheet");
  };

  return (
    <Container>
      <TopBarComponent
        title="Vocabulary"
        leftIcon={
          <Ionicons
            onPress={handleBack}
            name="arrow-back"
            size={28}
            color={colors.text.primary}
          />
        }
        rightIcon={
          <Ionicons
            name="help-circle-outline"
            size={24}
            color={colors.text.primary}
            onPress={openInstructionsSheet}
          />
        }
      />
      
      <ShowGames />

    </Container>
  );
}
