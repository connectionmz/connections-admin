import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, EmailAuthProvider, OAuthProvider } from 'firebase/auth';
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD5kPi8SWWETgvqEX0fT5KlrKAXqEajtio",
  authDomain: "connectionmz.firebaseapp.com",
  projectId: "connectionmz",
  storageBucket: "connectionmz.firebasestorage.app",
  messagingSenderId: "1063227375294",
  appId: "1:1063227375294:web:4d494e2d9951302fade8ef",
  measurementId: "G-FDXBJWJ0M4"
};

/** 🔴 Configuração do Projeto 2 - Connections */
const firebaseConfig2 = {
  apiKey: "AIzaSyChEniFx32nBnrcOvditSwLTglTBPTCWVQ",
  authDomain: "connections-d1be1.firebaseapp.com",
  databaseURL: "https://connections-d1be1-default-rtdb.firebaseio.com",
  projectId: "connections-d1be1",
  storageBucket: "connections-d1be1.appspot.com",
  messagingSenderId: "89340878669",
  appId: "1:89340878669:web:83a91ab3aab71257c66104",
  measurementId: "G-HZRYF1DR6N"
};
// Initialize Firebase with the first project

const app = initializeApp(firebaseConfig);
const app2 = initializeApp(firebaseConfig2, "appSecundario"); // nome personalizado

const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

// 🔴 App 2 - Connections
export const db2 = getDatabase(app2);
export const storage2 = getStorage(app2);

const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com'); 
const emailProvider = EmailAuthProvider;

export { auth, googleProvider, facebookProvider, appleProvider, emailProvider };

export default app;
