import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, EmailAuthProvider, OAuthProvider } from 'firebase/auth';
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDdWDE9sGuIBBfVrdpiUuoaKJEDviDmSaQ",
  authDomain: "connectiopos.firebaseapp.com",
  databaseURL: "https://connectiopos-default-rtdb.firebaseio.com",
  projectId: "connectiopos",
  storageBucket: "connectiopos.appspot.com",
  messagingSenderId: "1083339114910",
  appId: "1:1083339114910:web:3b2188a57862888ddb6e8f",
  measurementId: "G-8GTHHH8VKN"
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
