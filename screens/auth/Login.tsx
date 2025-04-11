import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Switch, Text, TextInput, StatusBar } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TextComponent } from '@/components/TextComponent';
import InputComponent from '@/components/InputComponent';
import ButtonComponent from '@/components/ButtonComponent';
import Container from '@/components/ContainerComponent';
import { auth, db } from '@/config/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '@/constants/useTheme';  

type LoginPageNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface LoginPageProps {
  navigation: LoginPageNavigationProp;
}

const getStyles = (colors: any) => StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 50
  },
  inputContainer: {
    width: '90%',
    top: -70
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 250, // Adjust the width and height to your needs
    height: 100,
    marginBottom: 50
  },
  input: {
    height: 50,
    borderColor: 'white',
    borderWidth: 1,
    marginBottom: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: 'blue',
    borderRadius: 10,
    width: '60%',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 18,
    gap: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  rememberandbutton: {
    width: '70%',
    flexDirection: 'row',
    alignContent: 'center',
    alignItems: 'center',
    gap: '15',
    padding: 10,
  },
  welcomeText: {
    textAlign: 'center',
    marginBottom: 20
  },
  forgot: {
    position: 'absolute',
    bottom: -150,
    left: 90,
  },
  forgottext: {
    color: colors.text.secondary
  },
});

const Login: React.FC<LoginPageProps> = ({ navigation }) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData.role;

            // Navigate based on user role
            switch (userRole) {
              case 'teacher':
                router.replace('/teacher/profile')
                break;
              case 'student':
                router.navigate('/student/profile');
                break;
              case 'admin':
                router.navigate('/admin/AdminDashboard');
                break;
              default:
                console.error('Invalid user role');
            }
          }
        } catch (error) {
          console.error("Error getting user data:", error);
        }
      }
    });

    return () => unsubscribe();
  }, [navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      if (rememberMe) {
        await AsyncStorage.setItem('userEmail', email);
        await AsyncStorage.setItem('userPassword', password);
      } else {
        await AsyncStorage.removeItem('userEmail');
        await AsyncStorage.removeItem('userPassword');
      }
    } catch (error: any) {
      let errorMessage = 'An error occurred during login.';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      }
      Alert.alert('Login Failed', errorMessage);
    } finally {
    }
  };

  const goBack = () => {
    router.replace('/');
  };

  return (
    <Container>
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.contentContainer}
        >
        <TouchableOpacity onPress={goBack} style={{ position: 'absolute', top: 82, left: 12 }}>
          <Ionicons color={colors.text.primary} name='arrow-back' size={32} />
        </TouchableOpacity>
        
        <View>
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/images/brand/logo.png')}
                    style={styles.logo}
                    resizeMode="contain" 
                />
            </View>

            <TextComponent style={styles.welcomeText} weight='bold' size='xLarge'>Bem-vindo de volta!</TextComponent>
            <InputComponent
                placeholder="Seu login aqui"
                onChangeText={setEmail}
                value={email}
                keyboardType="email-address"
            />
            <InputComponent
                placeholder="Sua senha"
                onChangeText={setPassword}
                value={password}
                secureTextEntry
            />
          
            <View style={styles.rememberandbutton}>
                <View style={styles.rememberMeContainer}>
                    <Switch
                        value={rememberMe}
                        onValueChange={setRememberMe}
                        trackColor={{ false: 'gray', true: colors.colors.indigo }}
                        thumbColor={rememberMe ? 'white' : 'white'}
                    />
                    <TextComponent size='small' style={{ marginRight: 8 }}>Lembrar de mim</TextComponent>
                </View>
                <ButtonComponent iconName='arrow-forward-outline' iconSize={20} iconColor='white' color='indigo' title='Entrar'onPress={handleLogin}/>
            </View>

          <Link style={styles.forgot} href="/">
            <TextComponent weight='regular' size='medium' style={styles.forgottext}>Esqueceu a senha?</TextComponent>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
}

export default Login;