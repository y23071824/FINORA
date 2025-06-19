// ✅ firebase-sync.js 完整修正版本（支援試用期後自動切換本機帳本）

// ✅ 試用期過期時停用 Firebase 功能（非 devMode）
const createdAt = localStorage.getItem("userCreatedAt");
const devMode = localStorage.getItem("devMode") === "yes";
if (createdAt) {
  const daysUsed = (Date.now() - parseInt(createdAt, 10)) / (1000 * 60 * 60 * 24);
  if (daysUsed > 30 && !devMode) {
    console.log("⛔ 試用期已過，firebase-sync.js 停用 Firebase 功能");
    return;
  }
}

// ✅ Firebase 初始化
if (!firebase.apps.length) {
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
}

const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

const MAX_ACCOUNT_COUNT = 3;
let currentUser = null;
let selectedAccount = localStorage.getItem("selectedAccount") || null;

function getLocalStorageKey() {
  return `assets_${selectedAccount || "default"}`;
}

function ensureLoggedIn() {
  currentUser = firebase.auth().currentUser;
  if (!currentUser) throw new Error("尚未登入");
}

function getAccountAssetRef() {
  ensureLoggedIn();
  if (!selectedAccount) throw new Error("尚未選擇帳戶");
  return db.collection("users").doc(currentUser.uid).collection("accounts").doc(selectedAccount).collection("assets");
}

async function fetchAccountList() {
  ensureLoggedIn();
  const snapshot = await db.collection("accounts").where("uid", "==", currentUser.uid).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function setAccountDisplayName(accountId, displayName) {
  ensureLoggedIn();
  if (!accountId || !displayName || displayName.trim() === "") throw new Error("帳本資料無效");
  const docRef = db.collection("accounts").doc(accountId);
  await docRef.set({ uid: currentUser.uid, displayName }, { merge: true });
}

async function createNewAccount(displayName) {
  ensureLoggedIn();
  const list = await fetchAccountList();
  if (list.length >= MAX_ACCOUNT_COUNT) throw new Error(`最多只能建立 ${MAX_ACCOUNT_COUNT} 本帳本`);
  const newId = Date.now().toString();
  await setAccountDisplayName(newId, displayName);
  return newId;
}

async function deleteAccount(accountId) {
  ensureLoggedIn();
  if (!accountId) throw new Error("帳本 ID 無效");
  const ref = db.collection("accounts").doc(accountId);
  const assetRef = db.collection("users").doc(currentUser.uid).collection("accounts").doc(accountId).collection("assets");
  const assets = await assetRef.get();
  const batch = db.batch();
  assets.forEach(doc => batch.delete(doc.ref));
  batch.delete(ref);
  await batch.commit();
  if (selectedAccount === accountId) {
    selectedAccount = null;
    localStorage.removeItem("selectedAccount");
    localStorage.removeItem(getLocalStorageKey());
  }
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
      const cloudAssets = await FINORA_AUTH.fetchUserAssets();
      if (Array.isArray(cloudAssets)) {
        localStorage.setItem(getLocalStorageKey(), JSON.stringify(cloudAssets));
      }
      return currentUser;
    } catch (e) {
      console.error("登入失敗", e);
      alert("登入失敗，請稍後再試");
      return null;
    }
  },

  signOutFromGoogle: async () => {
    await auth.signOut();
    currentUser = null;
    selectedAccount = null;
    localStorage.removeItem("selectedAccount");
    localStorage.removeItem(getLocalStorageKey());
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
          const assets = snap.docs.map(doc => doc.data());
          localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
        } catch (e) {
          console.warn("❗雲端讀取失敗：", e);
        }
      }
      callback(user);
    });
  },

  fetchUserAssets: async () => {
    await FINORA_AUTH.waitForLogin();
    const ref = getAccountAssetRef();
    const snap = await ref.get();
    return snap.docs.map(doc => doc.data());
  },

  saveUserAssets: async (assets) => {
    try {
      const ref = getAccountAssetRef();
      const batch = db.batch();
      const docs = await ref.get();
      docs.forEach(doc => batch.delete(doc.ref));
      assets.forEach(asset => batch.set(ref.doc(), asset));
      await batch.commit();
    } catch (e) {
      console.error("❌ 資產儲存失敗：", e);
      alert("❌ 儲存失敗，請確認您已登入並選擇有效帳本");
    }
  },

  waitForLogin: () => {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe();
        user ? resolve(user) : reject(new Error("尚未登入"));
      });
    });
  },

  getCurrentAccount: () => selectedAccount,
  setSelectedAccount: (name) => {
    selectedAccount = name;
    localStorage.setItem("selectedAccount", name);
  },
  fetchAccountList,
  setAccountDisplayName,
  createNewAccount,
  deleteAccount,
  addAccount: createNewAccount // ✅ 補回 addAccount 功能
};
