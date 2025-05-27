// === 主題切換功能 ===

// 取得主題選擇器
const themeSelect = document.getElementById("theme-select");

// 套用主題的函式
function applyTheme(theme) {
  // 先移除舊的主題 class
  document.body.classList.remove("theme-light", "theme-pink", "theme-dark");
  // 加上新的主題 class
  document.body.classList.add("theme-" + theme);
  // 儲存主題選擇到 localStorage
  localStorage.setItem("theme", theme);
}

// 網頁載入時，套用使用者上次儲存的主題
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("theme") || "light"; // 預設為 light
  applyTheme(saved);
  if (themeSelect) themeSelect.value = saved;
});

// 當使用者改變主題選單時，套用新主題
if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
  });
}
