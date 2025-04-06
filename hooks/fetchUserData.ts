import { doc, getDoc, DocumentData } from "firebase/firestore";
import { db } from "../config/firebase"; // ajuste o caminho conforme necessário

/**
 * Fetches user data from Firestore using the user's UID.
 *
 * @param {string} uid - The UID of the user.
 * @returns {Promise<DocumentData>} A promise that resolves with the user data.
 * @throws An error if the user document doesn't exist or if the fetch fails.
 */
export async function fetchUserData(uid: string): Promise<DocumentData> {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return userDocSnap.data();
    } else {
      throw new Error("User data not found.");
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
}