// ✅ firebase-sync.js（強化版：防呆 + 帳本切換 + 雲端同步 + 修正登入遺失）

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

const MAX_ACCOUNT_COUNT = 3;

let currentUser = null;
let selectedAccount = localStorage.getItem("selectedAccount") || null;

// ✅ 共用 localStorage key 函式
function getLocalStorageKey() {
  return `assets_${selectedAccount || "default"}`;
}

// ✅ 登入檢查
function ensureLoggedIn() {
  currentUser = firebase.auth().currentUser;
  if (!currentUser) throw new Error("尚未登入");
}

// ✅ 雲端資產參考
function getAccountAssetRef() {
  ensureLoggedIn();
  if (!selectedAccount) throw new Error("尚未選擇帳戶");
  return db.collection("users").doc(currentUser.uid)
           .collection("accounts").doc(selectedAccount)
           .collection("assets");
}

// ✅ 取得帳本清單
async function fetchAccountList() {
  ensureLoggedIn();
  const snapshot = await db.collection("accounts")
    .where("uid", "==", currentUser.uid)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ✅ 設定帳本顯示名稱
async function setAccountDisplayName(accountId, displayName) {
  ensureLoggedIn();
  if (!accountId) throw new Error("帳本 ID 無效");
  if (!displayName || displayName.trim() === "") throw new Error("帳本名稱不能為空");
  const docRef = db.collection("accounts").doc(accountId);
  await docRef.set({ uid: currentUser.uid, displayName }, { merge: true });
}

// ✅ 建立帳本（最多 3 本）
async function createNewAccount(displayName) {
  ensureLoggedIn();
  const list = await fetchAccountList();
  if (list.length >= MAX_ACCOUNT_COUNT) throw new Error(`最多只能建立 ${MAX_ACCOUNT_COUNT} 本帳本`);
  const newId = Date.now().toString();
  await setAccountDisplayName(newId, displayName);
  return newId;
}

// ✅ 刪除帳本（含所有資產）
async function deleteAccount(accountId) {
  ensureLoggedIn();
  if (!accountId) throw new Error("帳本 ID 無效");
  const ref = db.collection("accounts").doc(accountId);
  const assetRef = ref.collection("assets");
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

// ✅ 全域 FINORA_AUTH 方法
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
          const assets = snap.docs.map(d => d.data());
          localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
        } catch (e) {
          console.warn("❗雲端讀取失敗：", e);
        }
      }
      callback(user);
    });
  },

  loadUserAssets: async () => {
    try {
      const ref = getAccountAssetRef();
      const snap = await ref.get();
      return snap.docs.map(doc => doc.data());
    } catch (e) {
      console.warn("載入雲端資產失敗", e);
      return [];
    }
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
const FINORA_AUTH = {
  async fetchUserAssets() {
    return new Promise((resolve, reject) => {
      const user = firebase.auth().currentUser;
      if (!user) return reject(new Error("尚未登入"));

      const db = firebase.firestore();
      const selectedAccount = localStorage.getItem("selectedAccount") || "default";

      db.collection("finora_users")
        .doc(user.uid)
        .collection("accounts")
        .doc(selectedAccount)
        .get()
        .then((doc) => {
          if (doc.exists && doc.data()) {
            resolve(doc.data().assets || []);
          } else {
            resolve([]);
          }
        })
        .catch((err) => reject(err));
    });
  },

  async initFirebase() {
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
      });
    }
  },

  async waitForLogin() {
    return new Promise((resolve, reject) => {
      const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
        unsubscribe();
        if (user) resolve(user);
        else reject(new Error("尚未登入"));
      });
    });
  }
};

  getCurrentAccount: () => selectedAccount,

  setSelectedAccount: (name) => {
    selectedAccount = name;
    localStorage.setItem("selectedAccount", name);
  },

  fetchAccountList,
  setAccountDisplayName,
  createNewAccount,
  deleteAccount
};
