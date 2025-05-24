import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJE12oIoK4gr153jkNBokQ-d3ohnN4aWE",
  authDomain: "finora-d8cb3.firebaseapp.com",
  projectId: "finora-d8cb3",
  storageBucket: "finora-d8cb3.firebasestorage.app",
  messagingSenderId: "716455528328",
  appId: "1:716455528328:web:16f6e68311e4deb2c31c3d",
  measurementId: "G-KGS1T8F00Y"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
let currentUser = null;

window.FINORA_AUTH = {
  // ✅ 1. 登入
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      currentUser = result.user;
      return currentUser;
    } catch (e) {
      console.error("登入失敗", e);
      return null;
    }
  },

  // ✅ 2. 登出
  signOutFromGoogle: () => {
    signOut(auth);
  },

  // ✅ 3. 監聽登入狀態
  onUserChanged: (callback) => {
    onAuthStateChanged(auth, (user) => {
      currentUser = user;
      callback(user);
    });
  },

  // ✅ 4. 載入雲端資產資料
  loadUserAssets: async () => {
    if (!currentUser) return null;
    const ref = doc(db, "users", currentUser.uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().assets || [] : [];
  },

  // ✅ 5. 儲存資產資料至雲端
  saveUserAssets: async (assets) => {
    if (!currentUser) return;
    const ref = doc(db, "users", currentUser.uid);
    await setDoc(ref, { assets }, { merge: true });
  }
};
