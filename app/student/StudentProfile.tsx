import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { auth, db, storage } from '../../config/firebase';
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'red',
        padding: 20,
    },
    scrollContainer: {
        flexGrow: 1,
    },
    centeredContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileContainer: {
        backgroundColor: 'red',
        borderRadius: 10,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
    },
    avatar: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'red',
        marginBottom: 5,
    },
    email: {
        fontSize: 16,
        color: 'red',
        marginBottom: 15,
    },
    button: {
        backgroundColor: 'darkGrayColor',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        width: '60%',
        marginBottom: 5
    },
    buttonText: {
        color: 'textLightColor',
        fontWeight: 'bold',
        textAlign: 'center'
    },
    notificationsContainer: {
      backgroundColor: 'containerColor',
      borderRadius: 10,
      padding: 20,
      marginBottom: 20,
      alignItems: 'center',
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        fontWeight: 'semibold',
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginBottom: 5,
        width: '100%',
    },
    notificationText: {
        padding: 10,
        fontWeight: 'semibold',
        color: 'textColor',
        marginRight: 15,
        textAlign: 'justify',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.79)',
    },
    modalContent: {
        backgroundColor: 'darkGrayColor',
        color: 'textLightColor',
        padding: 50,
        borderRadius: 10,
        width: '80%',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalInput: {
        borderWidth: 1,
        backgroundColor: 'lightGrayColor',
        borderColor: 'lightGrayColor',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
    },
    checklistContainer: { 
        backgroundColor: 'containerColor',
        borderRadius: 10,
        padding: 20,
        marginBottom: 40,
    }
});

type ImagePickerResult =
  | { canceled: true } // When the user cancels the picker
  | { canceled: false; assets: ImageInfo[] }; // When the user selects an image

type ImageInfo = {
  uri: string;
  width: number;
  height: number;
  type?: 'image' | 'video';
  exif?: { [key: string]: any };
  base64?: string;
};

export default function ProfileScreen() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
    const [emailToReset, setEmailToReset] = useState('');
    const [contratoFoiAssinado, setContratoFoiAssinado] = useState<{ signed: boolean; logs: { logID: string; signedAt: string; segundaParteAssinou: boolean }[] } | null>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [profilePictureURL, setProfilePictureURL] = useState<string | null>(null);
    const [nivelamentoPermitido, setNivelamentoPermitido] = useState(false);
    const [user, setUser] = useState<any>(null)
    const router = useRouter();
    const handleLogout = async () => {
      try {
        await signOut(auth); // Firebase sign out
        await AsyncStorage.removeItem('userToken');
        router.replace('/');
      } catch (error) {
        console.error("Error logging out:", error);
        Alert.alert("Error");
      }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
            if (authUser) {
                setUser(authUser)
                try {
                    const profile = doc(db, 'users', authUser.uid);
                    const docSnap = await getDoc(profile);
                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                        setContratoFoiAssinado(docSnap.data().ContratoAssinado || { signed: false, logs: [] });
                        setProfilePictureURL(docSnap.data().profilePictureURL);
                        setNivelamentoPermitido(docSnap.data().NivelamentoPermitido);
                    } else {
                        console.log("No such document!");
                        setError("User data not found.");
                    }
                } catch (error) {
                    console.error("Error fetching document: ", error);
                    setError("Failed to fetch user data: " + error);
                } finally {
                    setLoading(false);
                }

                try {
                    const notificationsCollection = collection(db, 'Notificacoes');
                    const querySnapshot = await getDocs(notificationsCollection);
                    const fetchedNotifications = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setNotifications(fetchedNotifications);
                } catch (error) {
                    console.error('Error fetching notifications:', error);
                }
            } else {
                setLoading(false);
                setUser(null)
                router.replace('/')
            }
        });

        return () => unsubscribe();
    }, []);

    const handleResetPassword = async () => {
        if (!emailToReset) {
            Alert.alert('Erro', 'Por favor, insira um endereço de e-mail válido.');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, emailToReset);
            Alert.alert('Sucesso', 'Um e-mail de redefinição de senha foi enviado.');
            setResetPasswordVisible(false);
        } catch (error: any) {
            console.error('Erro ao enviar e-mail de redefinição de senha:', error);
            Alert.alert('Erro', 'Erro ao enviar e-mail de redefinição de senha. ' + error.message);
        }
    };

    const handleProfilePictureChange = async () => {
      // Request camera or library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to choose an image!');
        return;
      }
    
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    
      // Check if the user selected an image or canceled the picker
      if (!result.canceled) {
        const selectedImage = result.assets[0];
        if (selectedImage?.uri) {
          try {
            // Upload image to Firebase Storage
            const reference = ref(storage, `profilePictures/${user.uid}`);
            const imageBlob = await (await fetch(selectedImage.uri)).blob(); // Convert image to Blob
            await uploadBytes(reference, imageBlob);
            const downloadURL = await getDownloadURL(reference);
    
            // Update user profile picture in Firestore
            await setDoc(doc(db, 'users', user.uid), {
              ...userData,
              profilePictureURL: downloadURL,
            });
    
            setProfilePictureURL(downloadURL);
          } catch (error) {
            console.error('Error uploading profile picture:', error);
            alert('Failed to upload the profile picture. Please try again.');
          }
        }
      }
    };
    
    const getFilteredNotifications = () => {
        if (!user) return notifications;
        const { role } = userData; // Access role from userData
        if (role === 'teacher') {
            return notifications.filter(notification => notification.sendTo.professors);
        }
        if (role === 'student') {
            return notifications.filter(notification => notification.sendTo.students);
        }
        return notifications;
    };

    const handleContratoPress = async () => {
        if (!contratoFoiAssinado?.signed) {
            router.navigate('/')
        }
    }

    const handleNivelamentoPress = async () => {
        if (nivelamentoPermitido) {
            router.navigate('/')
        }
    }

    if (loading) {
        return (
            <View style={styles.centeredContent}>
                <ActivityIndicator size="large" color={'blueColor'} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centeredContent}>
                <Text style={{ color: 'red' }}>{error}</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
        <View style={styles.profileContainer}>
            <TouchableOpacity onPress={handleProfilePictureChange}>
                {profilePictureURL ? (
                    <Image source={{ uri: profilePictureURL }} style={{ width: 150, height: 150, borderRadius: 100 }} />
                ) : (
                    <View style={styles.avatar}>
                        <Ionicons name="person-outline" size={50} color={'lightGrayColor'} />
                    </View>
                )}
            </TouchableOpacity>
            {userData && (
                <>
                    <Text style={styles.name}>{userData.name}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </>
            )}
            <TouchableOpacity
              style={styles.button}
              onPress={() => setResetPasswordVisible(true)} // Show the modal
            >
              <Text style={styles.buttonText}>Recuperar Senha</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={[styles.button, { backgroundColor: 'redColor' }]}>
              <Text style={styles.buttonText}>Sair</Text>
            </TouchableOpacity>
        </View>

        {contratoFoiAssinado && (
            <View style={styles.checklistContainer}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'textColor', marginBottom: 10, textAlign: 'center' }}>Check-list</Text>
                
                <TouchableOpacity style={[styles.notificationItem, {backgroundColor: 'containerItemColor'}]} onPress={handleContratoPress}>
                    <Ionicons name={contratoFoiAssinado?.signed ? "checkmark-circle-outline" : "alert-circle-outline"} size={24} color={contratoFoiAssinado?.signed ? 'greenColor' : 'redColor'} />
                    <Text style={{ ...styles.notificationText, color: 'textColor', flex: 1, textAlign: 'center' }}>Contrato {contratoFoiAssinado?.signed ? "assinado e válido" : "não assinado ainda"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.notificationItem, {backgroundColor: 'containerItemColor'}]} onPress={handleNivelamentoPress}>
                    <Ionicons name={nivelamentoPermitido ? "alert-circle-outline" : "checkmark-circle-outline"} size={24} color={nivelamentoPermitido ? 'redColor' : 'greenColor'} />
                    <Text style={{ ...styles.notificationText, color: 'textColor', flex: 1, textAlign: 'center' }}>{nivelamentoPermitido ? "Fazer nivelamento" : "Nivelamento feito!"}</Text>
                </TouchableOpacity>
                {!profilePictureURL && (
                    <View style={[styles.notificationItem, {backgroundColor: 'containerItemColor'}]}>
                        <Ionicons name="alert-circle-outline" size={24} color={'white'} />
                        <Text style={{ ...styles.notificationText, color: 'textColor', flex: 1, textAlign: 'center' }}>Foto de perfil não adicionada</Text>
                    </View>
                )}
            </View>
        )}

        <Modal
            visible={resetPasswordVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setResetPasswordVisible(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: 'textLightColor' }}>Recuperar Senha</Text>
                    <TextInput
                        style={styles.modalInput}
                        placeholder={user?.email} // Use user?.email
                        onChangeText={setEmailToReset}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignContent: 'center', gap: 5, width: '80%' }}>
                        <TouchableOpacity style={[styles.button, { backgroundColor: 'green' }]} onPress={handleResetPassword}>
                            <Text style={styles.buttonText}>Enviar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, { backgroundColor: 'gray' }]} onPress={() => setResetPasswordVisible(false)}>
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    </ScrollView>
    );
}