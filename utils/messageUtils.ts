// src/utils/messageUtils.ts
import { Message } from '@/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Updates a message with translation in Firestore
 */
export const updateMessageWithTranslation = async (
  chatRoomId: string, 
  messageId: string, 
  translation: string
): Promise<void> => {
  try {
    const messageRef = doc(db, 'chats', chatRoomId, 'messages', messageId);
    await updateDoc(messageRef, { translation });
  } catch (error) {
    console.error('Failed to update message with translation:', error);
    throw error;
  }
};

/**
 * Helper to get chat room ID from user IDs
 */
export const getChatRoomId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}-${sortedIds[1]}`;
};