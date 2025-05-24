// firebase-sync.js（非 module，不使用 import）
const firebaseConfig = {
  apiKey: "AIzaSyBJE12oIoK4gr153jkNBokQ-d3ohnN4aWE",
  authDomain: "finora-d8cb3.firebaseapp.com",
  projectId: "finora-d8cb3",
  storageBucket: "finora-d8cb3.firebasestorage.app",
  messagingSenderId: "716455528328",
  appId: "1:716455528328:web:16f6e68311e4deb2c31c3d",
  measurementId: "G-KGS1T8F00Y"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;

window.FINORA_AUTH = {
  signInWithGoogle: async () => {
    try {
      const result = await auth.signInWithPopup(provider);
      currentUser = result.user;
      return currentUser;
    } catch (e) {
      console.error("登入失敗", e);
      return null;
    }
  },

  signOutFromGoogle: () => {
    auth.signOut();
  },

  onUserChanged: (callback) => {
    auth.onAuthStateChanged(user => {
      currentUser = user;
      callback(user);
    });
  },

  loadUserAssets: async () => {
    if (!currentUser) return null;
    const ref = db.collection("users").doc(currentUser.uid);
    const snap = await ref.get();
    return snap.exists ? snap.data().assets || [] : [];
  },

  saveUserAssets: async (assets) => {
    if (!currentUser) return;
    const ref = db.collection("users").doc(currentUser.uid);
    await ref.set({ assets }, { merge: true });
  }
};
