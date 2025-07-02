import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, EmailAuthProvider, OAuthProvider } from 'firebase/auth';
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCNNNmVpL9mmwPwighQkz53YlOadIvdRas",
  authDomain: "connectionmz.firebaseapp.com",
  projectId: "connectionmz",
  storageBucket: "connectionmz.firebasestorage.app",
  messagingSenderId: "1063227375294",
  appId: "1:1063227375294:web:4d494e2d9951302fade8ef",
  measurementId: "G-FDXBJWJ0M4"
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
