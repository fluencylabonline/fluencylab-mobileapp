import { doc, getDoc, DocumentData } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage } from "../config/firebase"; // ajuste o caminho conforme necessário

  /* 
 * Fetches user data from Firestore using the user's UID and includes the profile picture URL.
 *
 * @param {string} uid - The UID of the user.
 * @returns {Promise<DocumentData>} A promise that resolves with the user data, including profilePictureUrl.
 * @throws An error if the user document doesn't exist or if the fetch fails.
 */

export async function fetchUserData(uid: string): Promise<DocumentData> {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error("User data not found.");
    }

    const userData = userDocSnap.data();

    // Try fetching profile picture
    try {
      const reference = ref(storage, `profilePictures/${uid}`);
      const url = await getDownloadURL(reference);
      userData.profilePictureUrl = url;
    } catch (error) {
      console.warn("No profile picture found or error loading it:", error);
      userData.profilePictureUrl = null; // Or a default placeholder URL
    }

    return userData;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}
