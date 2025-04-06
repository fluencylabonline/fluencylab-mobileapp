import React, { useState, useEffect } from 'react';

import Container from "@/components/ContainerComponent";
import { TextComponent } from "@/components/TextComponent";
import { Colors } from "@/constants/Colors";
import { View, TouchableOpacity, Image, StyleSheet } from "react-native";
import { fetchUserData } from '@/hooks/fetchUserData';
import NotificationIcon from '@/assets/icons/NotificationIcon';
import { useTheme } from '@/constants/useTheme';
import BottomSheetNotification from '@/components/Notification/Notification';

//Firebase & Auth
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../config/firebase';
import TopBarComponent from '@/components/TopBarComponent';
import { Ionicons } from '@expo/vector-icons';

const styles = StyleSheet.create({
    mainContainer: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignContent: 'center',
        alignItems: 'center',
        height: '85%'
    },
    profileContainer: {
        flexDirection: 'column',
        gap: 3
    },
    actionContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 15
    },

    checklistContainer: {
        width: '100%',
        padding: 18,
        gap: 4
      },
      courseContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        width: '100%',
        borderRadius: 8,
        padding: 12,
      },
      courseDone: {
        color: Colors.teal.default,
      },
      courseNotDone: {
        color: Colors.deepOrange.default,
      },
      noInfo: {
        color: Colors.text.secondaryDark || '#7f8c8d',
        fontSize: 16,
        textAlign: 'center',
      },
  });

export default function TeacherProfile(){
    const [user, setUser] = useState<any>();
    const [coursesArray, setCoursesArray] = useState<boolean[]>([]);
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [isNotificationVisible, setIsNotificationVisible] = useState(false);
    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
        if (authUser) {
        try {
            const data = await fetchUserData(authUser.uid);
            const courses: boolean[] = Object.values(data.courses);
            setUser(data);
            setCoursesArray(courses);
        } catch (error) {
            console.error("Error fetching basic user data:", error);
        } finally {
            //
            }
        } else {
            //logout
            setUser(null);
        }});

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
      try {
        await signOut(auth); // Firebase sign out
        await AsyncStorage.removeItem('userToken');
        router.replace('/');
      } catch (error) {
        console.error("Error logging out:", error);
      }
    };

    const handleNotificationPress = () => {
        setIsNotificationVisible(true);
    };

    return(
        <Container>
            <TopBarComponent
                title="Perfil"
                leftIcon={
                    <TouchableOpacity onPress={handleNotificationPress}>
                        <NotificationIcon />
                    </TouchableOpacity>
                }
                rightIcon={<Ionicons onPress={() => router.push('/screens/Settings/Settings')} name="settings-outline" size={26} color={colors.text} />}
            />

            <View style={styles.mainContainer}>
                <View style={styles.profileContainer}>
                    <Image source={{ uri: user?.profilePictureURL?? "" }} style={{ width: 160, height: 160, borderRadius: 100, marginBottom: 4 }} />
                    <TextComponent weight='bold'>{user?.name ?? "Carregando..."}</TextComponent>
                    <TextComponent weight='bold' size='small' color={Colors.text.secondaryDark}>Professor</TextComponent>
                </View>

                
                <View style={styles.checklistContainer}>
                    <TextComponent weight="bold" size="medium">Check-list</TextComponent>
                    {Array.isArray(coursesArray) && coursesArray.length > 0 ? (
                        <View
                        style={[
                            styles.courseContainer,
                            { backgroundColor: colors.cardBackground }
                        ]}
                        >
                        {coursesArray.every(course => course) ? (
                            <TextComponent 
                                weight='bold'
                                size='medium'
                                style={[
                                    coursesArray.every(course => course)
                                    ? styles.courseDone
                                    : styles.courseNotDone,
                                ]}
                            >
                            Curso de instruções feito! 
                            </TextComponent>
                        ) : (
                            <TouchableOpacity >
                            <TextComponent 
                                weight='bold'
                                size='medium'
                                style={[
                                    coursesArray.every(course => course)
                                    ? styles.courseDone
                                    : styles.courseNotDone,
                                ]}
                            >
                                Fazer curso de instruções
                            </TextComponent>
                            </TouchableOpacity>
                        )}
                        </View>
                    ) : (
                        <TextComponent 
                            weight='bold' 
                            size='medium' 
                            style={{ color: colors.secondaryText }}
                        >
                            Sem informação disponível
                        </TextComponent>
                    )}
                </View>

                <View style={styles.actionContainer}>
                    <TextComponent weight="bold" size="medium">Recuperar Senha</TextComponent>
                    <TouchableOpacity onPress={handleLogout}>
                        <TextComponent color={Colors.deepOrange.default} weight="bold" size="medium">
                            Sair
                        </TextComponent>
                    </TouchableOpacity>
                </View>
            </View>

            <BottomSheetNotification 
                visible={isNotificationVisible} 
                onUpdateNotificationCount={setNotificationCount}
            />
        </Container>
    )
}

