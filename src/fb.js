import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, EmailAuthProvider, OAuthProvider } from 'firebase/auth';
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyChEniFx32nBnrcOvditSwLTglTBPTCWVQ",
  authDomain: "connections-d1be1.firebaseapp.com",
  databaseURL: "https://connections-d1be1-default-rtdb.firebaseio.com",
  projectId: "connections-d1be1",
  storageBucket: "connections-d1be1.appspot.com",
  messagingSenderId: "89340878669",
  appId: "1:89340878669:web:83a91ab3aab71257c66104",
  measurementId: "G-HZRYF1DR6N"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
auth.settings.appVerificationDisabledForTesting = true;

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com'); 
const emailProvider = EmailAuthProvider;

export { auth, googleProvider, facebookProvider, appleProvider, emailProvider };

export default app;
