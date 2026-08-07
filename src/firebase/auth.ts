import { 
  signOut, 
  UserCredential,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { auth } from "./config";

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Configure auth persistence - keep user logged in
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

// Detect mobile device
const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth < 768);
};

// Handle redirect result on page load (for mobile redirect flow)
export const handleRedirectResult = async (): Promise<UserCredential | null> => {
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (error) {
    console.error('Error handling redirect result:', error);
    return null;
  }
};

// Sign in with Google - uses redirect on mobile, popup on desktop
export const loginWithGoogle = async (): Promise<UserCredential> => {
  // Use persistent session
  await setPersistence(auth, browserLocalPersistence);
  
  if (isMobile()) {
    // On mobile, use redirect to avoid popup blocking issues
    await signInWithRedirect(auth, googleProvider);
    // This code won't be reached - browser will redirect
    return new Promise(() => {}); // Pending promise since redirect happens
  }
  
  return signInWithPopup(auth, googleProvider);
};

// Sign in with Email and Password
export const loginWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  await setPersistence(auth, browserLocalPersistence);
  return signInWithEmailAndPassword(auth, email, password);
};

// Register with Email and Password
export const registerWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  await setPersistence(auth, browserLocalPersistence);
  return createUserWithEmailAndPassword(auth, email, password);
};

// Sign out
export const logoutUser = async (): Promise<void> => {
  return signOut(auth);
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Get current user
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};
