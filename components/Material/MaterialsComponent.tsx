import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  StyleSheet, 
  Linking, 
  useColorScheme
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { getStorage, ref, uploadBytes, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { Ionicons } from '@expo/vector-icons';
import { TextComponent } from '../TextComponent';
import ButtonComponent from '../ButtonComponent';
import { Colors } from '@/constants/Colors';

interface Material {
  name: string;
  url: string;
}

interface MaterialsComponentProps {
  studentID: string;
}

const MaterialsComponent: React.FC<MaterialsComponentProps> = ({ studentID }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState('');
  const storage = getStorage();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const cardStyle = {
    ...styles.modalContent,
    backgroundColor: isDark ? Colors.background.dark : Colors.background.light,
    shadowColor: isDark ? "#000" : "#666",
  };

  useEffect(() => {
    if (studentID) {
      fetchMaterials();
    }
  }, [studentID]);

  const fetchMaterials = async () => {
    try {
      const materialsRef = ref(storage, `alunosmateriais/${studentID}/materiais/archives`);
      const materialList = await listAll(materialsRef);
      const materialUrls = await Promise.all(materialList.items.map(async (item) => {
        const downloadUrl = await getDownloadURL(item);
        return { name: item.name, url: downloadUrl };
      }));
      setMaterials(materialUrls);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      
      if (result.canceled) return;

      const file = result.assets[0];
      const fileRef = ref(storage, `alunosmateriais/${studentID}/materiais/archives/${file.name}`);
      
      const response = await fetch(file.uri);
      const blob = await response.blob();
      await uploadBytes(fileRef, blob);
      console.log('File uploaded successfully!');
      // Exiba uma mensagem de sucesso, por exemplo, usando Toast ou Alert
      fetchMaterials();
    } catch (error) {
      console.error('Error uploading file:', error);
      // Exiba uma mensagem de erro
    }
  };

  const renderMaterialIcon = (fileName: string) => {
    const fileType = fileName.split('.').pop()?.toLowerCase();
    switch (fileType) {
      case 'pdf':
        return <Ionicons name="document-text-outline" size={24} />;
      case 'mp3':
        return <Ionicons name="musical-notes-outline" size={24} />;
      case 'mp4':
        return <Ionicons name="videocam-outline" size={24} />;
      case 'txt':
        return <Ionicons name="document-outline" size={24} />;
      case 'jpg':
      case 'png':
        return <Ionicons name="image-outline" size={24} />;
      default:
        return <Ionicons name="document-outline" size={24} />;
    }
  };

  const handleDownload = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const openModal = (fileName: string) => {
    setFileToDelete(fileName);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleFileDelete = async (fileName: string) => {
    const fileRef = ref(storage, `alunosmateriais/${studentID}/materiais/archives/${fileName}`);
    try {
      await deleteObject(fileRef);
      // Exiba uma mensagem de sucesso
      fetchMaterials();
      closeModal();
    } catch (error) {
      console.error('Error deleting file:', error);
      // Exiba uma mensagem de erro
      closeModal();
    }
  };

  const renderItem = ({ item }: { item: Material }) => (
    <View style={styles.materialItem}>
      <TextComponent weight="regular" size="small" style={styles.materialName}>{item.name}</TextComponent>
      <View style={styles.iconContainer}>
        {renderMaterialIcon(item.name)}
        <TouchableOpacity onPress={() => handleDownload(item.url)}>
          <Ionicons name="cloud-download-outline" size={24} style={styles.icon} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openModal(item.name)}>
          <Ionicons name="trash-outline" size={24} style={styles.icon} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextComponent weight="bold" size="medium" style={styles.title}>Materiais</TextComponent>
      <FlatList
        data={materials}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        style={styles.list}
      />
      <ButtonComponent color='indigo' title='Upload de arquivo' onPress={handleFileUpload} />

      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={cardStyle}>
            <TextComponent weight="bold" size="medium" style={styles.modalTitle}>
              Tem certeza que deseja excluir o arquivo {fileToDelete}?
            </TextComponent>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButtonDanger} 
                onPress={() => handleFileDelete(fileToDelete)}
              >
                <TextComponent style={styles.modalButtonText}>Sim, excluir</TextComponent>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
                <TextComponent style={styles.modalButtonText}>Não, cancelar</TextComponent>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MaterialsComponent;

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginVertical: 10,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  list: {
    maxHeight: 200,
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 10,
  },
  materialName: {
    flex: 1,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginHorizontal: 8,
  },
  uploadButton: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    padding: 24,
    borderRadius: 8,
    width: '80%',
  },
  modalTitle: {
    fontSize: 16,
    marginBottom: 22,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButtonDanger: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 8,
  },
  modalButton: {
    backgroundColor: '#6c757d',
    padding: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
