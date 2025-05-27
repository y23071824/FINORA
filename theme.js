
// ===== 主題切換邏輯 =====
const themeSelect = document.getElementById("theme-select");

function applyTheme(theme) {
  document.body.classList.remove("theme-light", "theme-pink", "theme-dark");
  document.body.classList.add("theme-" + theme);
  localStorage.setItem("theme", theme); // 儲存使用者選擇
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("theme") || "light";
  applyTheme(saved);
  if (themeSelect) themeSelect.value = saved;
});

if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
  });
}
