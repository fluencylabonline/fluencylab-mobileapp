import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
  FlatList,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { TextComponent } from '@/components/TextComponent';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '@/config/firebase';

interface MaterialBottomSheetProps {
  studentID: string;
  onClose: () => void;
  visible: boolean;
}

interface Material {
  name: string;
  url: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const MaterialBottomSheet: React.FC<MaterialBottomSheetProps> = ({ studentID, onClose, visible }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showModal, setShowModal] = useState(visible);
  const translateY = useState(new Animated.Value(SCREEN_HEIGHT))[0];

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (studentID) {
      fetchMaterials();
    }
  }, [studentID]);

  const fetchMaterials = async () => {
    try {
      const materialsRef = ref(storage, `alunosmateriais/${studentID}/materiais/archives`);
      const materialList = await listAll(materialsRef);
      const materialUrls = await Promise.all(
        materialList.items.map(async (item) => {
          const downloadUrl = await getDownloadURL(item);
          return { name: item.name, url: downloadUrl };
        })
      );
      setMaterials(materialUrls);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const renderMaterialIcon = (fileName: string) => {
    const fileType = fileName.split('.').pop()?.toLowerCase();
    switch (fileType) {
      case 'pdf':
        return <Ionicons name="document-text-outline" size={24} color={colors.text.primary} />;
      case 'mp3':
        return <Ionicons name="musical-notes-outline" size={24} color={colors.text.primary} />;
      case 'mp4':
        return <Ionicons name="videocam-outline" size={24} color={colors.text.primary} />;
      case 'txt':
        return <Ionicons name="document-outline" size={24} color={colors.text.primary} />;
      case 'jpg':
      case 'png':
        return <Ionicons name="image-outline" size={24} color={colors.text.primary} />;
      default:
        return <Ionicons name="document-outline" size={24} color={colors.text.primary} />;
    }
  };

  const handleDownload = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  return (
    <Modal visible={showModal} animationType="none" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.bottomSheetContainer, { transform: [{ translateY }] }]}>
        <View style={styles.handleBar} />
        <TextComponent
          weight="bold"
          size="large"
          style={[styles.title, { color: colors.colors.tealLight }]}
        >
          Material
        </TextComponent>

        <FlatList
          data={materials}
          keyExtractor={(item) => item.name}
          contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleDownload(item.url)} style={styles.materialItem}>
              {renderMaterialIcon(item.name)}
              <TextComponent numberOfLines={1} style={{ marginLeft: 10, color: colors.text.primary }}>
                {item.name}
              </TextComponent>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <TextComponent style={{ color: colors.text.secondary, textAlign: 'center' }}>
                Nenhum material disponível.
              </TextComponent>
            </View>
          }
        />
      </Animated.View>
    </Modal>
  );
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    bottomSheetContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: SCREEN_HEIGHT * 0.65,
      backgroundColor: colors.bottomSheet.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 16,
    },
    handleBar: {
      alignSelf: 'center',
      width: 70,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: colors.colors.tealLight,
      marginBottom: 10,
    },
    title: {
      textAlign: 'center',
      marginBottom: 22,
    },
    emptyListContainer: {
      marginTop: 40,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    materialItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
    },
  });

export default MaterialBottomSheet;
