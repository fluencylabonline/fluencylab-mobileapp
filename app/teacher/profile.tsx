import React, { useState, useEffect } from 'react';

import Container from "@/components/ContainerComponent";
import { TextComponent } from "@/components/TextComponent";
import { View, TouchableOpacity, Image, StyleSheet, Platform } from "react-native";
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

const getStyles = (colors: any) => StyleSheet.create({
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
        marginTop: 8
      },
      courseDone: {
        color: colors.colors.teal,
      },
      courseNotDone: {
        color: colors.colors.deepOrange,
      },
      noInfo: {
        color: colors.text.secondary,
        fontSize: 16,
        textAlign: 'center',
      },
      notificationIconContainer: {
        padding: 4, 
      },
      badgeContainer: {
        position: 'absolute',
        top: 20, 
        right: 3, 
        backgroundColor: colors.colors.amber, 
        borderRadius: 10, 
        width: 13, 
        height: 13, 
        justifyContent: 'center',
        alignItems: 'center',
        ...(Platform.OS === 'android' && { elevation: 3 }),
        ...(Platform.OS === 'ios' && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.3,
          shadowRadius: 1,
        }),
      },
      badgeText: {
        color: colors.text.primary, 
        fontSize: 8,
        fontWeight: 'bold',
      },
  });

export default function TeacherProfile(){
    const [user, setUser] = useState<any>();
    const [coursesArray, setCoursesArray] = useState<boolean[]>([]);
    const { colors } = useTheme();
    const styles = getStyles(colors);
    
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
        await signOut(auth);
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
                        <View style={styles.notificationIconContainer}>
                        <NotificationIcon />
                            {notificationCount > 0 && (
                                <View style={styles.badgeContainer}>
                                    <TextComponent weight="bold" style={styles.badgeText}>
                                        {notificationCount > 99 ? '99+' : notificationCount}
                                    </TextComponent>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                }
                rightIcon={<Ionicons onPress={() => router.push('/screens/Settings/Settings')} name="settings-outline" size={26} color={colors.text.primary} />}
            />

            <View style={styles.mainContainer}>
                <View style={styles.profileContainer}>
                    <Image source={{ uri: user?.profilePictureURL?? "" }} style={{ width: 160, height: 160, borderRadius: 100, marginBottom: 4 }} />
                    <TextComponent style={{color: colors.text.primary}} weight='bold' size='large'>{user?.name ?? "Carregando..."}</TextComponent>
                    <TextComponent style={{color: colors.text.secondary}} weight='bold' size='small'>Professor</TextComponent>
                </View>

                
                <View style={styles.checklistContainer}>
                    <TextComponent weight="bold" size="medium">Check-list</TextComponent>
                    {Array.isArray(coursesArray) && coursesArray.length > 0 ? (
                        <View
                        style={[
                            styles.courseContainer,
                            { backgroundColor: colors.cards.primary }
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
                            style={{ color: colors.text.secondary }}
                        >
                            Sem informação disponível
                        </TextComponent>
                    )}
                </View>

                <View style={styles.actionContainer}>
                    <TextComponent weight="bold" size="medium">Recuperar Senha</TextComponent>
                    <TouchableOpacity onPress={handleLogout}>
                        <TextComponent style={{color: colors.colors.deepOrange}} weight="bold" size="medium">
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

