import Container from "@/components/ContainerComponent";
import InputComponent from "@/components/InputComponent";
import { auth, db, storage } from "@/config/firebase";
import { query, collection, where, getDocs, getDoc, doc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { useState, useEffect } from "react";
import { View, useColorScheme, StyleSheet, FlatList, Image } from 'react-native';
import PersonIcon from '@/assets/icons/PersonIcon';
import { TextComponent } from "@/components/TextComponent";
import { Link } from 'expo-router';
import Loading from '@/components/Animation/Loading';
import { useTheme } from "@/constants/useTheme";


export default function Index(){
    const [professorId, setProfessorId] = useState<string | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const backgroundColor = colors.background.primary;

    const fetchProfilePicture = async (uid: any) => {
      try {
          const reference = ref(storage, `profilePictures/${uid}`);
          const url = await getDownloadURL(reference);
          return url;
      } catch (error) {
          // Handle error or return a default URL
      }
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    const userDoc = doc(db, 'users', currentUser.uid);
                    const userSnap = await getDoc(userDoc);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        if (userData.role === 'student') {
                            setUserRole('student');
                            setProfessorId(userData.professorId);
                            setLoading(false);
                        } else if (userData.role === 'teacher') {
                            setUserRole('teacher');
                            setProfessorId(currentUser.uid);
                        }
                    } else {
                        console.log('User document not found');
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            }
        };
        fetchUserData();
    }, []);

    useEffect(() => {
      const fetchStudents = async () => {
          if (userRole === 'teacher' && professorId) {
              try {
                  const studentsQuery = query(collection(db, 'users'), where('professorId', '==', professorId));
                  const studentsSnap = await getDocs(studentsQuery);
                  const fetchedStudents = [];
      
                  for (const docSnap of studentsSnap.docs) {
                      const studentData = docSnap.data();
                      const studentProfilePictureURL = await fetchProfilePicture(docSnap.id); // Fetch profile picture URL
                      const studentStatus = studentData.status || 'offline'; // Get student's status
                      
                      fetchedStudents.push({
                          uid: docSnap.id,
                          name: studentData.name,
                          profilePictureURL: studentProfilePictureURL, // Add profile picture URL to student data
                          status: studentStatus, // Add status
                      });
                  }
      
                  setStudents(fetchedStudents);
                  setLoading(false);
              } catch (error) {
                  console.error('Error fetching students:', error);
              }
          }
      };

        fetchStudents();
    }, [professorId, userRole]);

    const filteredStudents = students.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
      return (
        <Container>
          <Loading />
        </Container>
      );
    }

    return(
      <Container>
          <View style={styles.searchBarContainer}>
            <InputComponent
                placeholder="Procurar aluno..."
                value={searchTerm}
                onChangeText={setSearchTerm}
            />
          </View>

          <FlatList
            style={{paddingBottom: 30}}
            data={filteredStudents}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => ( 
              <Link href={{
                    pathname: "/screens/Aluno/[painel]",
                    params: {
                        studentID: item.uid,
                        studentName: item.name,
                        painel: 'painel'
                    }
                }}>
                  <View style={styles.studentItem}>
                      <View style={styles.profileImageContainer}>
                          {item.profilePictureURL ? (
                              <Image
                              style={styles.profileImage}
                              source={{ uri: item.profilePictureURL }}
                              />
                          ) : (
                              <View style={[styles.profileImagePlaceholder, { backgroundColor: backgroundColor }]}>
                                  <PersonIcon  />
                              </View>
                          )}
                          <View
                              style={[
                              styles.statusBadge,
                              { backgroundColor: item.status === 'online' ? colors.colors.teal : colors.colors.deepOrange },
                          ]}
                          />
                      </View>
                      <View style={{ flexDirection: 'column', alignContent: 'flex-start' }}>
                          <TextComponent weight="bold" size="medium" >{item.name}</TextComponent>
                      </View>
                  </View>
              </Link> 
            )}
          />
      </Container>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    studentItem: {
        flexDirection: 'row',   
        alignItems: 'center', 
        paddingVertical: 10,        
        paddingHorizontal: 15,  
        gap: 10
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 100,
    },
    profileImageContainer: {
        position: 'relative',
    },
    statusBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: 'white',
    },
    profileImagePlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 100,
        flexDirection: 'row',
        alignContent: 'center',
        justifyContent: 'center',
        alignItems: 'center'
    },
    searchBarContainer: {
        padding: 10,
    },
    searchInput: {
        height: 40,
        borderRadius: 20,
        paddingLeft: 10,
        backgroundColor: colors.background.list,
        fontSize: 16,
    }
});
