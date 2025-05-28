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
let selectedAccount = localStorage.getItem("selectedAccount") || null;

function getAccountAssetRef() {
  if (!currentUser) throw new Error("尚未登入");
  if (!selectedAccount) throw new Error("尚未選擇帳戶");
  return db.collection("users").doc(currentUser.uid).collection("accounts").doc(selectedAccount).collection("assets");
}

async function fetchAccountList() {
  if (!currentUser) throw new Error("尚未登入");
  const snapshot = await db.collection("accounts").where("uid", "==", currentUser.uid).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function setAccountDisplayName(accountId, displayName) {
  if (!currentUser) throw new Error("尚未登入");
  const docRef = db.collection("accounts").doc(accountId);
  await docRef.set({ uid: currentUser.uid, displayName }, { merge: true });
}

window.FINORA_AUTH = {
  signInWithGoogle: async () => {
    try {
      const result = await auth.signInWithPopup(provider);
      currentUser = result.user;

      if (!selectedAccount) {
        selectedAccount = "default";
        localStorage.setItem("selectedAccount", selectedAccount);
      }

      const cloudAssets = await FINORA_AUTH.loadUserAssets();
      if (cloudAssets.length > 0) {
        localStorage.setItem("assets", JSON.stringify(cloudAssets));
      }

      return currentUser;
    } catch (e) {
      console.error("登入失敗", e);
      return null;
    }
  },

  signOutFromGoogle: async () => {
    await auth.signOut();
    currentUser = null;
    selectedAccount = null;
    localStorage.removeItem("selectedAccount");
    localStorage.removeItem("assets");
  },

  onUserChanged: (callback) => {
    auth.onAuthStateChanged(async user => {
      currentUser = user;
      if (user) {
        selectedAccount = localStorage.getItem("selectedAccount") || "default";
        localStorage.setItem("selectedAccount", selectedAccount);

        try {
          const ref = getAccountAssetRef();
          const snap = await ref.get();
          const assets = snap.docs.map(d => d.data());
          localStorage.setItem("assets", JSON.stringify(assets));
        } catch (e) {
          console.warn("❗雲端讀取失敗：", e);
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
  },

  getCurrentAccount: () => selectedAccount,

  setSelectedAccount: (name) => {
    selectedAccount = name;
    localStorage.setItem("selectedAccount", name);
  },

  // ✅ 補上帳本清單與命名功能
  fetchAccountList,
  setAccountDisplayName
};
