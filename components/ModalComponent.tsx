// ModalComponent.tsx

import React, { useRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors } from '../constants/Colors';
import { TextComponent } from './TextComponent';

interface ModalComponentProps {
  visible: boolean;
  onClose?: () => void;
  backgroundColor?: keyof typeof Colors;
  title?: string;
  content?: React.ReactNode;
  footerButtons?: React.ReactNode[];
}

const ModalComponent: React.FC<ModalComponentProps> = ({
  visible,
  onClose,
  backgroundColor = "spaceBlue",
  title,
  content,
  footerButtons,
}) => {
  const ModalBackgroundColor = Colors[backgroundColor]?.darker || Colors.spaceBlue.darker;
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%'], []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onChange={(index) => {
        if (index === -1 && visible) {
          onClose?.();
        }
      }}
      handleIndicatorStyle={{ backgroundColor: 'white', width: 65 }} // Optional
      backgroundStyle={{ backgroundColor: ModalBackgroundColor, borderRadius: 16 }} // Fixes the top background color
    >
      <BottomSheetView style={[styles.contentContainer, { backgroundColor: ModalBackgroundColor }]}>
      {title && <TextComponent weight='bold' size='large' style={{color: 'white'}}>{title}</TextComponent>}
        {content && <View style={styles.modalBody}>{content}</View>}
        {footerButtons && footerButtons.length > 0 && (
          <View style={styles.modalFooter}>
            {footerButtons.map((button, index) => (
              <View key={index} style={styles.footerButtonContainer}>
                {button}
              </View>
            ))}
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    alignItems: 'center',
    margin: 6
  },
  modalBody: {
    width: '100%',
    marginBottom: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  footerButtonContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default ModalComponent;
