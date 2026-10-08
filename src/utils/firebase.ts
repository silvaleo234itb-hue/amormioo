import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: getFirestore must pass firebaseConfig.firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
};

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_CONSOLE_AUTH_SETTINGS_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

export interface AuthErrorInfo {
  code: string;
  message: string;
  isUnauthorizedDomain: boolean;
  domain?: string;
  consoleUrl?: string;
}

export function formatFirebaseAuthError(error: any): AuthErrorInfo {
  const code = error?.code || '';
  const message = error?.message || '';
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  if (code === 'auth/unauthorized-domain' || message.includes('auth/unauthorized-domain')) {
    return {
      code: 'auth/unauthorized-domain',
      message: `O domínio atual (${currentHostname}) precisa ser adicionado à lista de "Domínios autorizados" no Firebase Console para usar login com Google.`,
      isUnauthorizedDomain: true,
      domain: currentHostname,
      consoleUrl: FIREBASE_CONSOLE_AUTH_SETTINGS_URL,
    };
  }

  if (code === 'auth/user-not-found') {
    return {
      code,
      message: 'Nenhum usuário encontrado com este e-mail. Se ainda não possui senha, clique em "Cadastrar Senha".',
      isUnauthorizedDomain: false,
    };
  }

  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return {
      code,
      message: 'Senha incorreta ou credenciais inválidas. Verifique os dados digitados.',
      isUnauthorizedDomain: false,
    };
  }

  if (code === 'auth/email-already-in-use') {
    return {
      code,
      message: 'Este e-mail já possui uma conta no Firebase. Digite sua senha para entrar.',
      isUnauthorizedDomain: false,
    };
  }

  if (code === 'auth/weak-password') {
    return {
      code,
      message: 'A senha deve conter no mínimo 6 caracteres.',
      isUnauthorizedDomain: false,
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      code,
      message: 'A janela de login com Google foi fechada antes de concluir.',
      isUnauthorizedDomain: false,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      code,
      message: 'O navegador bloqueou a janela pop-up do Google. Permita pop-ups para continuar.',
      isUnauthorizedDomain: false,
    };
  }

  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      message: 'Este método de login precisa ser ativado no Firebase Console (Authentication > Sign-in method).',
      isUnauthorizedDomain: false,
    };
  }

  return {
    code,
    message: message || 'Ocorreu um erro ao autenticar. Tente novamente.',
    isUnauthorizedDomain: false,
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL CONSTRAINT: Test connection on app initialization
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

// Helper: Compress image on client via canvas with strict size guarantee to ensure fast, non-blocking preview and Firestore persistence
export async function compressImageFile(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.68
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          if (dataUrl.length > 250000) {
            const smallerCanvas = document.createElement('canvas');
            const smallerWidth = Math.min(width, 640);
            const smallerHeight = Math.round((height * smallerWidth) / width);
            smallerCanvas.width = smallerWidth;
            smallerCanvas.height = smallerHeight;
            const smallCtx = smallerCanvas.getContext('2d');
            if (smallCtx) {
              smallCtx.drawImage(img, 0, 0, smallerWidth, smallerHeight);
              dataUrl = smallerCanvas.toDataURL('image/jpeg', 0.58);
            }
          }
          resolve(dataUrl);
        } else {
          resolve(readerEvent.target?.result as string);
        }
      };
      img.onerror = () => {
        resolve(readerEvent.target?.result as string);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => {
      resolve('');
    };
    reader.readAsDataURL(file);
  });
}

// Upload photo to Firebase Storage with strict timeout and clean compressed fallback
export async function uploadImageToStorage(file: File, folder: string = 'memories'): Promise<string> {
  const compressedDataUrl = await compressImageFile(file, folder === 'letters' ? 750 : 800, 0.68);

  try {
    const filename = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, filename);

    const uploadPromise = async () => {
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'image/jpeg',
      });
      return await getDownloadURL(snapshot.ref);
    };

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timed out, using compressed photo')), 2500)
    );

    const downloadUrl = await Promise.race([uploadPromise(), timeoutPromise]);
    return downloadUrl;
  } catch (err) {
    console.info('Utilizando foto comprimida otimizada para nuvem Firestore:', err);
    return compressedDataUrl;
  }
}

// Check if user is authorized admin/editor
export const BOOTSTRAP_ADMIN_EMAIL = 'zeeremlk@gmail.com';
export const BOOTSTRAP_ADMIN_EMAILS = [
  'zeeremlk@gmail.com',
  'arangoohlean@gmail.com',
  'silvaleo234.itb@gmail.com',
];

export function isUserAdmin(
  currentUser: { email?: string | null; uid?: string } | null,
  authorizedEmails?: string[]
): boolean {
  if (!currentUser?.email) return false;
  const emailLower = currentUser.email.toLowerCase().trim();
  if (BOOTSTRAP_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === emailLower)) {
    return true;
  }
  if (authorizedEmails && authorizedEmails.some((e) => e.toLowerCase().trim() === emailLower)) {
    return true;
  }
  return false;
}
