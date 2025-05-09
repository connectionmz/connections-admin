import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, EmailAuthProvider, OAuthProvider } from 'firebase/auth';
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCKyu8Z2AENSyFP4Jw3z7ewL6xXJlGZ374",
  authDomain: "connectionmozambique-23a1b.firebaseapp.com",
  databaseURL: "https://connectionmozambique-23a1b-default-rtdb.firebaseio.com",
  projectId: "connectionmozambique-23a1b",
  storageBucket: "connectionmozambique-23a1b.firebasestorage.app",
  messagingSenderId: "179916616869",
  appId: "1:179916616869:web:eef1d27091fc6527a9094c",
  measurementId: "G-BY02RMLJKW"
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
