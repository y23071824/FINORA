const translations = {
  "zh-Hant": {
    title: "FINORA 好好存",
    subtitle: "讓資產更有力，退休不焦慮。",
    asset: "資產管理",
    compound: "複利試算",
    withdraw: "退休提領",
    emergency: "預備金試算",
    accountLabel: "帳本選擇：",
    rename: "✏️ 重新命名",
    add: "➕ 新增帳本",
    delete: "🗑️ 刪除帳本",
    save: "儲存",
    login: "🔐 使用 Google 帳號登入",
    logout: "🚪 登出",
    langLabel: "🌐 Language / 語言：",
    privacy: "FINORA 重視隱私。你的資產，只屬於你自己。",
    version: "v0.9 beta - 2025-06-04",
    footer: "© 2025 FINORA 好好存｜家庭友善資產整合工具",
    guide: "使用說明",
    contact: "聯絡我們",
    policy: "隱私權條款",
    placeholderNewAccount: "輸入新帳本名稱"
  },
  "zh-Hans": {
    title: "FINORA 好好存",
    subtitle: "让资产更有力，退休不焦虑。",
    asset: "资产管理",
    compound: "复利试算",
    withdraw: "退休提领",
    emergency: "预备金试算",
    accountLabel: "账本选择：",
    rename: "✏️ 重命名",
    add: "➕ 新增账本",
    delete: "🗑️ 删除账本",
    save: "保存",
    login: "🔐 使用 Google 账号登入",
    logout: "🚪 登出",
    langLabel: "🌐 Language / 语言：",
    privacy: "FINORA 重视隐私。你的资产，只属于你自己。",
    version: "v0.9 beta - 2025-06-04",
    footer: "© 2025 FINORA 好好存｜家庭友善资产整合工具",
    guide: "使用说明",
    contact: "联系我们",
    policy: "隐私权条款",
    placeholderNewAccount: "输入新账本名称"
  },
  "en": {
    title: "FINORA Wealth Planner",
    subtitle: "Make your assets powerful. Retire without worries.",
    asset: "Asset Manager",
    compound: "Compound Calculator",
    withdraw: "Withdrawal Planner",
    emergency: "Emergency Fund",
    accountLabel: "Select Account:",
    rename: "✏️ Rename",
    add: "➕ Add Account",
    delete: "🗑️ Delete Account",
    save: "Save",
    login: "🔐 Sign in with Google",
    logout: "🚪 Sign Out",
    langLabel: "🌐 Language:",
    privacy: "FINORA values your privacy. Your data is yours only.",
    version: "v0.9 beta - 2025-06-04",
    footer: "© 2025 FINORA Wealth｜Family-friendly asset organizer",
    guide: "User Guide",
    contact: "Contact Us",
    policy: "Privacy Policy",
    placeholderNewAccount: "Enter new account name"
  },
  "ja": {
    title: "FINORA 資産管理",
    subtitle: "資産を強く、安心なリタイアへ。",
    asset: "資産管理",
    compound: "複利計算",
    withdraw: "引き出し計画",
    emergency: "緊急資金",
    accountLabel: "帳簿の選択：",
    rename: "✏️ 名前を変更",
    add: "➕ 帳簿を追加",
    delete: "🗑️ 削除",
    save: "保存",
    login: "🔐 Googleでログイン",
    logout: "🚪 ログアウト",
    langLabel: "🌐 言語：",
    privacy: "FINORAはあなたのプライバシーを尊重します。資産はあなただけのものです。",
    version: "v0.9 beta - 2025-06-04",
    footer: "© 2025 FINORA 資産管理｜家族向けの資産統合ツール",
    guide: "使用方法",
    contact: "お問い合わせ",
    policy: "プライバシーポリシー",
    placeholderNewAccount: "新しい帳簿名を入力"
  }
};

function applyLang() {
  const lang = localStorage.getItem("lang") || "zh-Hant";
  const dict = translations[lang] || translations["zh-Hant"];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) el.setAttribute("placeholder", dict[key]);
  });
}
