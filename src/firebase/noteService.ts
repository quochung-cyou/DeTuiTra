import { db } from './config';
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Note } from '@/types';

const NOTES_COLLECTION = 'notes';
const notesRef = collection(db, NOTES_COLLECTION);

export const createNote = async (
  note: Omit<Note, 'id' | 'createdAt'>
): Promise<Note> => {
  const now = Date.now();

  const noteData = {
    ...note,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    title: note.title || 'Ghi chú mới',
    content: note.content || '',
  };

  const filteredData = Object.fromEntries(
    Object.entries(noteData).filter(([_, v]) => v !== undefined)
  );

  const docRef = await addDoc(notesRef, filteredData);

  return {
    ...noteData,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
  } as Note;
};

export const getFundNotes = async (fundId: string): Promise<Note[]> => {
  const q = query(
    notesRef,
    where('fundId', '==', fundId)
  );

  const querySnapshot = await getDocs(q);

  const notes = querySnapshot.docs.map(doc => {
    const data = doc.data();

    let createdAt = Date.now();
    if (data.createdAt instanceof Timestamp) {
      createdAt = data.createdAt.toMillis();
    } else if (typeof data.createdAt === 'number') {
      createdAt = data.createdAt;
    }

    let updatedAt = createdAt;
    if (data.updatedAt instanceof Timestamp) {
      updatedAt = data.updatedAt.toMillis();
    } else if (typeof data.updatedAt === 'number') {
      updatedAt = data.updatedAt;
    }

    return {
      ...data,
      id: doc.id,
      createdAt,
      updatedAt,
      title: data.title || 'Ghi chú mới',
      content: data.content || '',
    } as Note;
  });

  return notes.sort((a, b) => b.createdAt - a.createdAt);
};

export const getNoteById = async (noteId: string): Promise<Note | null> => {
  const docRef = doc(db, NOTES_COLLECTION, noteId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toMillis()
      : Date.now();

    return {
      ...data,
      id: docSnap.id,
      createdAt,
    } as Note;
  }

  return null;
};

export const updateNote = async (
  noteId: string,
  noteData: Partial<Omit<Note, 'id' | 'createdAt' | 'fundId' | 'createdBy'>>
): Promise<void> => {
  const docRef = doc(db, NOTES_COLLECTION, noteId);
  await updateDoc(docRef, {
    ...noteData,
    updatedAt: serverTimestamp(),
  });
};

export const deleteNote = async (noteId: string): Promise<void> => {
  const docRef = doc(db, NOTES_COLLECTION, noteId);
  await deleteDoc(docRef);
};
