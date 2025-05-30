// ✅ firebase-sync.js（強化版：防呆 + 錯誤提示 + 限制帳本 + 刪除功能） const firebaseConfig = { apiKey: "AIzaSyBJE12oIoK4gr153jkNBokQ-d3ohnN4aWE", authDomain: "finora-d8cb3.firebaseapp.com", projectId: "finora-d8cb3", storageBucket: "finora-d8cb3.appspot.com", messagingSenderId: "716455528328", appId: "1:716455528328:web:16f6e68311e4deb2c31c3d", measurementId: "G-KGS1T8F00Y" };

firebase.initializeApp(firebaseConfig); const auth = firebase.auth(); const db = firebase.firestore(); const provider = new firebase.auth.GoogleAuthProvider();

let currentUser = null; let selectedAccount = localStorage.getItem("selectedAccount") || null;

// ✅ 登入檢查（會更新 currentUser） function ensureLoggedIn() { currentUser = firebase.auth().currentUser; if (!currentUser) throw new Error("尚未登入"); }

// ✅ 取得資產資料庫參考 function getAccountAssetRef() { ensureLoggedIn(); if (!selectedAccount) throw new Error("尚未選擇帳戶"); return db.collection("users").doc(currentUser.uid) .collection("accounts").doc(selectedAccount) .collection("assets"); }

// ✅ 取得目前使用者的帳本清單 async function fetchAccountList() { ensureLoggedIn(); const snapshot = await db.collection("accounts") .where("uid", "==", currentUser.uid) .get(); return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); }

// ✅ 設定帳本名稱 async function setAccountDisplayName(accountId, displayName) { ensureLoggedIn(); if (!accountId) throw new Error("帳本 ID 無效"); if (!displayName || displayName.trim() === "") throw new Error("帳本名稱不能為空"); const docRef = db.collection("accounts").doc(accountId); await docRef.set({ uid: currentUser.uid, displayName }, { merge: true }); }

// ✅ 建立帳本（限制最多三本） async function createNewAccount(displayName) { ensureLoggedIn(); const list = await fetchAccountList(); if (list.length >= 3) throw new Error("最多只能建立 3 本帳本"); const newId = Date.now().toString(); await setAccountDisplayName(newId, displayName); return newId; }

// ✅ 刪除帳本 async function deleteAccount(accountId) { ensureLoggedIn(); if (!accountId) throw new Error("帳本 ID 無效"); const ref = db.collection("accounts").doc(accountId); const assetRef = ref.collection("assets"); const assets = await assetRef.get(); const batch = db.batch(); assets.forEach(doc => batch.delete(doc.ref)); batch.delete(ref); await batch.commit(); if (selectedAccount === accountId) { selectedAccount = null; localStorage.removeItem("selectedAccount"); localStorage.removeItem("assets"); } }

// ✅ 全域 FINORA_AUTH 方法 window.FINORA_AUTH = { signInWithGoogle: async () => { try { const result = await auth.signInWithPopup(provider); currentUser = result.user;

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
  alert("登入失敗，請稍後再試");
  return null;
}

},

signOutFromGoogle: async () => { await auth.signOut(); currentUser = null; selectedAccount = null; localStorage.removeItem("selectedAccount"); localStorage.removeItem("assets"); },

onUserChanged: (callback) => { auth.onAuthStateChanged(async user => { currentUser = user; if (user) { selectedAccount = localStorage.getItem("selectedAccount") || "default"; localStorage.setItem("selectedAccount", selectedAccount);

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

loadUserAssets: async () => { try { const ref = getAccountAssetRef(); const snap = await ref.get(); return snap.docs.map(doc => doc.data()); } catch (e) { console.warn("載入雲端資產失敗", e); return []; } },

saveUserAssets: async (assets) => { try { const ref = getAccountAssetRef(); const batch = db.batch(); const docs = await ref.get(); docs.forEach(doc => batch.delete(doc.ref)); assets.forEach(asset => batch.set(ref.doc(), asset)); await batch.commit(); } catch (e) { console.error("❌ 資產儲存失敗：", e); alert("❌ 儲存失敗，請確認您已登入並選擇有效帳本"); } },

getCurrentAccount: () => selectedAccount, setSelectedAccount: (name) => { selectedAccount = name; localStorage.setItem("selectedAccount", name); },

fetchAccountList, setAccountDisplayName, createNewAccount, deleteAccount };

