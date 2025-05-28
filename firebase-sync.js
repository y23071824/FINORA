// ✅ firebase-sync.js

const firebaseConfig = {
  apiKey: "AIzaSyBJE12oIoK4gr153jkNBokQ-d3ohnN4aWE",
  authDomain: "finora-d8cb3.firebaseapp.com",
  projectId: "finora-d8cb3",
  storageBucket: "finora-d8cb3.appspot.com",
  messagingSenderId: "716455528328",
  appId: "1:716455528328:web:16f6e68311e4deb2c31c3d",
  measurementId: "G-KGS1T8F00Y"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null;

function getAccountAssetRef() {
  if (!currentUser) throw new Error("尚未登入");
  const account = localStorage.getItem("selectedAccount");
  if (!account) throw new Error("尚未選擇帳戶");
  return db.collection("users").doc(currentUser.uid).collection("accounts").doc(account).collection("assets");
}

window.FINORA_AUTH = {
  // ✅ 使用 Popup 登入（避免 redirect reload 問題）
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

  signOutFromGoogle: async () => {
    await auth.signOut();
    currentUser = null;
    localStorage.removeItem("selectedAccount");
    localStorage.removeItem("assets");
  },

  onUserChanged: (callback) => {
    auth.onAuthStateChanged(async user => {
      currentUser = user;
      if (user) {
        const selectedAccount = localStorage.getItem("selectedAccount");
        if (selectedAccount) {
          try {
            const ref = db.collection("users").doc(user.uid).collection("accounts").doc(selectedAccount).collection("assets");
            const snap = await ref.get();
            const assets = snap.docs.map(d => d.data());
            localStorage.setItem("assets", JSON.stringify(assets));
          } catch (e) {
            console.warn("讀取帳本資料失敗：", e);
          }
        }
      }
      callback(user);
    });
  },

  loadUserAssets: async () => {
    if (!currentUser) return [];
    const ref = getAccountAssetRef();
    const snap = await ref.get();
    return snap.docs.map(doc => doc.data());
  },

  saveUserAssets: async (assets) => {
    if (!currentUser) throw new Error("尚未登入");
    const ref = getAccountAssetRef();
    const batch = db.batch();
    const docs = await ref.get();
    docs.forEach(doc => batch.delete(doc.ref));
    assets.forEach(asset => batch.set(ref.doc(), asset));
    await batch.commit();
  }
};
