import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Letter, AlbumConfig, TimelineMemory, LetterComment } from '../types/letter';
import { DEFAULT_LETTERS, DEFAULT_ALBUM_CONFIG } from '../data/initialLetters';

const LETTERS_COLLECTION = 'letters';
const CONFIG_COLLECTION = 'album_config';
const CONFIG_DOC_ID = 'main';
const MEMORIES_COLLECTION = 'memories';

// Defensive payload constraints matching firebase-blueprint.json maxLength & pattern invariants
const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function sanitizeId(rawId: string, fallbackPrefix: string): string {
  const cleaned = String(rawId || `${fallbackPrefix}-${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '-')
    .slice(0, 128);
  return ID_REGEX.test(cleaned) && cleaned.length > 0 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

// Sanitize letter payload for Firestore (enforces firebase-blueprint.json maxLength constraints)
function sanitizeLetter(letter: Letter): Record<string, any> {
  const clean: Record<string, any> = {
    id: sanitizeId(letter.id, 'letter'),
    order: Math.max(0, Math.min(10000, Number(letter.order) || 1)),
    title: String(letter.title || 'Carta de Amor').slice(0, 200),
    subtitle: String(letter.subtitle || '').slice(0, 500),
    date: String(letter.date || 'Hoje').slice(0, 100),
    content: String(letter.content || 'Com amor...').slice(0, 50000),
    signature: String(letter.signature || '').slice(0, 200),
    emoji: String(letter.emoji || '💌').slice(0, 20),
    images: Array.isArray(letter.images) ? letter.images.slice(0, 20) : [],
    animationIn: String(letter.animationIn || 'fade').slice(0, 50),
    backgroundTheme: String(letter.backgroundTheme || 'cream-paper').slice(0, 50),
    particleType: String(letter.particleType || 'hearts').slice(0, 50),
    particleIntensity: String(letter.particleIntensity || 'medium').slice(0, 50),
    imagePosition: String(letter.imagePosition || 'top').slice(0, 50),
    published: typeof letter.published === 'boolean' ? letter.published : true,
  };

  if (letter.highlightPhrase) clean.highlightPhrase = String(letter.highlightPhrase).slice(0, 500);
  if (letter.videoUrl) clean.videoUrl = String(letter.videoUrl).slice(0, 1000);
  if (typeof letter.isFinalLetter === 'boolean') clean.isFinalLetter = letter.isFinalLetter;
  if (letter.postType) clean.postType = String(letter.postType).slice(0, 50);
  if (letter.category) clean.category = String(letter.category).slice(0, 100);
  if (letter.location) clean.location = String(letter.location).slice(0, 200);

  const validLikedBy = Array.isArray(letter.likedBy)
    ? letter.likedBy
        .filter((u): u is string => typeof u === 'string' && u.length > 0)
        .slice(0, 100)
        .map((u) => u.slice(0, 100))
    : [];
  clean.likedBy = validLikedBy;
  if (typeof letter.likesCount === 'number' && letter.likesCount !== 999 && letter.likesCount >= 0) {
    clean.likesCount = Math.min(10000, letter.likesCount);
  } else {
    clean.likesCount = validLikedBy.length;
  }

  if (typeof letter.isLiked === 'boolean') clean.isLiked = letter.isLiked;
  if (Array.isArray(letter.comments)) clean.comments = letter.comments.slice(0, 200);
  if (typeof letter.isPinned === 'boolean') clean.isPinned = letter.isPinned;
  if (letter.authorId) clean.authorId = String(letter.authorId).slice(0, 50);
  if (letter.authorName) clean.authorName = String(letter.authorName).slice(0, 100);
  if (letter.recipientName) clean.recipientName = String(letter.recipientName).slice(0, 100);
  clean.updatedAt = new Date().toISOString();

  return clean;
}

// Sanitize album config for Firestore
function sanitizeConfig(config: AlbumConfig): Record<string, any> {
  return {
    recipientName: String(config.recipientName || 'Meu Amor').slice(0, 100),
    senderName: String(config.senderName || 'Leo').slice(0, 100),
    coverTitle: String(config.coverTitle || 'Cartas de Amor').slice(0, 200),
    coverSubtitle: String(config.coverSubtitle || 'Para a Mulher da Minha Vida').slice(0, 300),
    coverButtonText: String(config.coverButtonText || 'Abrir Nossa História de Amor').slice(0, 100),
    musicEnabled: typeof config.musicEnabled === 'boolean' ? config.musicEnabled : true,
    musicVolume:
      typeof config.musicVolume === 'number' ? Math.max(0, Math.min(1, config.musicVolume)) : 0.4,
    relationshipStartDate: String(config.relationshipStartDate || '2023-10-14').slice(0, 100),
    heUser: {
      name: String(config.heUser?.name || 'Leo').slice(0, 100),
      password: String(config.heUser?.password || 'leo').slice(0, 100),
      avatarEmoji: String(config.heUser?.avatarEmoji || '🤵🏻').slice(0, 20),
    },
    sheUser: {
      name: String(config.sheUser?.name || 'Meu Amor').slice(0, 100),
      password: String(config.sheUser?.password || 'amor').slice(0, 100),
      avatarEmoji: String(config.sheUser?.avatarEmoji || '👰🏻‍♀️').slice(0, 20),
    },
    authorizedEmails: Array.isArray(config.authorizedEmails)
      ? config.authorizedEmails
          .filter((e): e is string => typeof e === 'string' && e.length > 0)
          .slice(0, 20)
          .map((e) => e.slice(0, 200))
      : ['zeeremlk@gmail.com', 'arangoohlean@gmail.com', 'silvaleo234.itb@gmail.com'],
    updatedAt: new Date().toISOString(),
  };
}

// Sanitize memory item
function sanitizeMemory(mem: TimelineMemory): Record<string, any> {
  return {
    id: sanitizeId(mem.id, 'mem'),
    date: String(mem.date || new Date().toISOString().split('T')[0]).slice(0, 100),
    title: String(mem.title || 'Momento Especial').slice(0, 300),
    caption: String(mem.caption || '').slice(0, 5000),
    photoUrl: String(mem.photoUrl || '').slice(0, 1048576),
    author: String(mem.author || 'Leo').slice(0, 100),
    location: mem.location ? String(mem.location).slice(0, 200) : '',
    createdAt: String(mem.createdAt || new Date().toISOString()).slice(0, 100),
    updatedAt: new Date().toISOString(),
  };
}

// ==========================================
// REAL-TIME SUBSCRIBERS
// ==========================================

export function subscribeLetters(
  onSuccess: (letters: Letter[]) => void,
  onFirstSeed?: () => void
): Unsubscribe {
  const lettersRef = collection(db, LETTERS_COLLECTION);
  const q = query(lettersRef, orderBy('order', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty && onFirstSeed) {
        onFirstSeed();
        return;
      }
      const loaded: Letter[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Letter;
        loaded.push({ ...data, id: docSnap.id });
      });
      loaded.sort((a, b) => a.order - b.order);
      if (loaded.length > 0) {
        onSuccess(loaded);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, LETTERS_COLLECTION);
    }
  );
}

export function subscribeAlbumConfig(
  onSuccess: (config: AlbumConfig) => void,
  onFirstSeed?: () => void
): Unsubscribe {
  const configDocRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);

  return onSnapshot(
    configDocRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        if (onFirstSeed) onFirstSeed();
        return;
      }
      const data = snapshot.data();
      const merged: AlbumConfig = {
        ...DEFAULT_ALBUM_CONFIG,
        ...(data as Partial<AlbumConfig>),
        memories: undefined,
      };
      onSuccess(merged);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${CONFIG_COLLECTION}/${CONFIG_DOC_ID}`);
    }
  );
}

export function subscribeMemories(
  onSuccess: (memories: TimelineMemory[]) => void,
  onFirstSeed?: () => void
): Unsubscribe {
  const memoriesRef = collection(db, MEMORIES_COLLECTION);
  const q = query(memoriesRef, orderBy('date', 'desc'));
  let hasInitialized = false;

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty && !hasInitialized && onFirstSeed) {
        hasInitialized = true;
        onFirstSeed();
        return;
      }
      hasInitialized = true;
      const loaded: TimelineMemory[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as TimelineMemory;
        loaded.push({ ...data, id: docSnap.id });
      });
      loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onSuccess(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, MEMORIES_COLLECTION);
    }
  );
}

// ==========================================
// FIRESTORE CRUD OPERATIONS
// ==========================================

export async function saveLetterToFirestore(letter: Letter): Promise<void> {
  const payload = sanitizeLetter(letter);
  const docRef = doc(db, LETTERS_COLLECTION, payload.id);
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${LETTERS_COLLECTION}/${payload.id}`);
  }
}

export async function saveAllLettersToFirestore(letters: Letter[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    letters.forEach((letter) => {
      const payload = sanitizeLetter(letter);
      const docRef = doc(db, LETTERS_COLLECTION, payload.id);
      batch.set(docRef, payload, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, LETTERS_COLLECTION);
  }
}

export async function deleteLetterFromFirestore(letterId: string): Promise<void> {
  const cleanId = sanitizeId(letterId, 'letter');
  const docRef = doc(db, LETTERS_COLLECTION, cleanId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${LETTERS_COLLECTION}/${cleanId}`);
  }
}

export async function saveAlbumConfigToFirestore(config: AlbumConfig): Promise<void> {
  const docRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
  const payload = sanitizeConfig(config);
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CONFIG_COLLECTION}/${CONFIG_DOC_ID}`);
  }
}

export async function saveMemoryToFirestore(memory: TimelineMemory): Promise<void> {
  const payload = sanitizeMemory(memory);
  const docRef = doc(db, MEMORIES_COLLECTION, payload.id);
  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MEMORIES_COLLECTION}/${payload.id}`);
  }
}

export async function deleteMemoryFromFirestore(memoryId: string): Promise<void> {
  const cleanId = sanitizeId(memoryId, 'mem');
  const docRef = doc(db, MEMORIES_COLLECTION, cleanId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MEMORIES_COLLECTION}/${cleanId}`);
  }
}

export async function toggleLetterLikeInFirestore(
  letter: Letter,
  userIdentifier: string = 'visitor'
): Promise<{ newLiked: boolean; newLikesCount: number; newLikedBy: string[] }> {
  const cleanId = sanitizeId(letter.id, 'letter');
  const docRef = doc(db, LETTERS_COLLECTION, cleanId);
  const currentLikedBy = Array.isArray(letter.likedBy) ? [...letter.likedBy] : [];
  const alreadyLiked = currentLikedBy.includes(userIdentifier);

  let newLikedBy: string[];
  let newLiked: boolean;

  if (alreadyLiked) {
    newLikedBy = currentLikedBy.filter((u) => u !== userIdentifier);
    newLiked = false;
  } else {
    newLikedBy = [...currentLikedBy, userIdentifier];
    newLiked = true;
  }

  const newLikesCount = Math.max(0, newLikedBy.length);

  try {
    await setDoc(
      docRef,
      {
        id: cleanId,
        isLiked: newLiked,
        likesCount: newLikesCount,
        likedBy: newLikedBy.slice(0, 100),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${LETTERS_COLLECTION}/${cleanId}`);
  }

  return { newLiked, newLikesCount, newLikedBy };
}

export async function addLetterCommentInFirestore(
  letterId: string,
  targetLetter: Letter,
  comment: LetterComment
): Promise<void> {
  const cleanId = sanitizeId(letterId, 'letter');
  const docRef = doc(db, LETTERS_COLLECTION, cleanId);
  const updatedComments = [...(targetLetter.comments || []), comment].slice(0, 200);
  try {
    await setDoc(
      docRef,
      {
        comments: updatedComments,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${LETTERS_COLLECTION}/${cleanId}`);
  }
}

// ==========================================
// SEEDING & LOCALSTORAGE MIGRATION
// ==========================================

let isSeedingInProgress = false;

export async function seedInitialDataIfEmpty(): Promise<boolean> {
  if (isSeedingInProgress) return true;
  isSeedingInProgress = true;
  try {
    const configDoc = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID));
    if (configDoc.exists()) {
      return true;
    }

    const lettersSnap = await getDocs(collection(db, LETTERS_COLLECTION));
    if (lettersSnap.empty) {
      await saveAllLettersToFirestore(DEFAULT_LETTERS);
    }

    await saveAlbumConfigToFirestore(DEFAULT_ALBUM_CONFIG);

    const memoriesSnap = await getDocs(collection(db, MEMORIES_COLLECTION));
    if (memoriesSnap.empty && DEFAULT_ALBUM_CONFIG.memories) {
      for (const mem of DEFAULT_ALBUM_CONFIG.memories) {
        await saveMemoryToFirestore(mem);
      }
    }
    return true;
  } catch (err) {
    console.warn('Verificação de seed inicial falhou ou offline:', err);
    return false;
  } finally {
    isSeedingInProgress = false;
  }
}

export async function migrateLocalStorageToFirestore(): Promise<{
  success: boolean;
  migratedLetters: number;
  migratedMemories: number;
  message: string;
}> {
  try {
    let letterCount = 0;
    let memoryCount = 0;

    // 1. Migrate letters
    const rawLetters = localStorage.getItem('amor_cartas_album_v1');
    if (rawLetters) {
      const parsedLetters = JSON.parse(rawLetters);
      if (Array.isArray(parsedLetters) && parsedLetters.length > 0) {
        await saveAllLettersToFirestore(parsedLetters);
        letterCount = parsedLetters.length;
      }
    }

    // 2. Migrate config & memories
    const rawConfig = localStorage.getItem('amor_album_config_v1');
    if (rawConfig) {
      const parsedConfig = JSON.parse(rawConfig);
      if (parsedConfig && typeof parsedConfig === 'object') {
        await saveAlbumConfigToFirestore(parsedConfig);
        if (Array.isArray(parsedConfig.memories) && parsedConfig.memories.length > 0) {
          for (const m of parsedConfig.memories) {
            await saveMemoryToFirestore(m);
            memoryCount++;
          }
        }
      }
    }

    return {
      success: true,
      migratedLetters: letterCount,
      migratedMemories: memoryCount,
      message: `Migração concluída com sucesso! ${letterCount} cartas e ${memoryCount} fotos foram sincronizadas no Firestore.`,
    };
  } catch (error) {
    return {
      success: false,
      migratedLetters: 0,
      migratedMemories: 0,
      message: `Erro na migração: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
