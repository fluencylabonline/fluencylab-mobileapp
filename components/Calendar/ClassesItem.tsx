import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextComponent } from '../TextComponent';
import { useTheme } from '@/constants/useTheme';

interface ClassDateItemProps {
  date: Date;
  status: string;
  onDone: () => void;
  onCancel: () => void;
  onDelete: () => void;
  loading?: boolean;
}

const ClassDateItem: React.FC<ClassDateItemProps> = ({ date, status, onDone, onCancel, onDelete, loading }) => {
    const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
    const { colors } = useTheme();
    const styles = getStyles(colors);
  
    // Get status styles dynamically
    const getStatusStyles = (status: string) => { 
      const { colors } = useTheme(); 
      const styles = getStyles(colors); 
  
      switch (status) { 
          case 'Feita': 
              return { color: colors.text.primary, backgroundColor: colors.colors.tealLight }; 
          case 'Cancelada': 
              return { color: colors.text.primary, backgroundColor: colors.colors.amber }; 
          case 'À Fazer': 
              return { color: colors.text.primary, backgroundColor: colors.colors.gray }; 
          case 'Atrasada': 
              return { color: colors.text.primary, backgroundColor: colors.colors.deepOrangeLight }; 
          default: 
              return { color: colors.text.primary, backgroundColor: colors.background.primary }; 
      } 
    };
  
    const statusStyles = getStatusStyles(status);
    const formattedDay = new Intl.DateTimeFormat('pt-PT', { weekday: 'short' }).format(date);
    const capitalizedDay = formattedDay.charAt(0).toUpperCase() + formattedDay.slice(1);
  
    // Handlers to call the provided functions and then close the modal
    const handleOptionPress = (action: () => void) => {
      action();
      setBottomSheetVisible(false);
    };
  
    return (
      <View style={styles.itemContainer}>
        {/* Tapping on the date opens the bottom sheet */}
        <TouchableOpacity
        style={[styles.dateContainer, { backgroundColor: statusStyles.backgroundColor }]}
        onPress={() => setBottomSheetVisible(true)}
        disabled={loading}
        >
            {loading ? (
            <ActivityIndicator size="small" color={statusStyles.color} />
            ) : (
            <TextComponent size="small" weight="bold" style={{ color: statusStyles.color }}>
                {`${capitalizedDay}, ${date.getDate()}`}
            </TextComponent>
            )}
        </TouchableOpacity>
  
        {/* Bottom sheet modal */}
        <Modal
          visible={isBottomSheetVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setBottomSheetVisible(false)}
        >
          {/* Tapping outside of the bottom sheet closes it */}
          <TouchableWithoutFeedback onPress={() => setBottomSheetVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.bottomSheet}>
                  <TextComponent size='medium' weight='bold' style={{ textAlign: 'center', marginBottom: 20 }}>
                    Aula de {formattedDay} dia {date.getDate()}
                  </TextComponent>
                  <TouchableOpacity
                    style={[styles.optionButton, { backgroundColor: colors.colors.tealLight }]}
                    onPress={() => handleOptionPress(onDone)}
                  >
                    <TextComponent size='small' weight='bold' style={styles.optionButtonText}>
                      Feita
                    </TextComponent>
                    <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.optionButton, { backgroundColor: colors.colors.amber }]}
                    onPress={() => handleOptionPress(onCancel)}
                  >
                    <TextComponent size='small' weight='bold' style={styles.optionButtonText}>
                      Cancelar
                    </TextComponent>
                    <Ionicons name="close-circle-outline" size={16} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.optionButton, { backgroundColor: colors.colors.deepOrangeLight }]}
                    onPress={() => handleOptionPress(onDelete)}
                  >
                    <TextComponent size='small' weight='bold' style={styles.optionButtonText}>
                      Deletar
                    </TextComponent>
                    <Ionicons name="trash-outline" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  };
  

const getStyles = (colors: any) =>
  StyleSheet.create({
    itemContainer: {
      marginBottom: 10,
    },
    dateContainer: {
      padding: 10,
      backgroundColor: colors.background.primary,
      borderRadius: 8,
      alignItems: 'center',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: colors.modalOverlay.primary,
    },
    bottomSheet: {
      backgroundColor: colors.bottomSheet.background,
      padding: 35,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 6,
      marginBottom: 10,
      justifyContent: 'space-between',
    },
    optionButtonText: {
      color: colors.colors.white,
      marginRight: 10,
    },
  });

export default ClassDateItem;
