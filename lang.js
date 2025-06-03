const translations = {
  "zh-Hant": {
    title: "FINORA 好好存",
    subtitle: "讓資產更有力，退休不焦慮。",
    asset: "資產管理",
    compound: "複利試算",
    withdraw: "退休提領",
    emergency: "預備金試算",
    login: "🔐 使用 Google 帳號登入",
    logout: "🚪 登出",
    accountLabel: "帳本選擇：",
    rename: "✏️",
    add: "➕",
    delete: "🗑️",
    privacy: "FINORA 重視隱私。你的資產，只屬於你自己。",
    version: "v0.9 beta - 2025-05-29",
    footer: "© 2025 FINORA 好好存｜家庭友善資產整合工具",
    guide: "使用說明",
    contact: "聯絡我們",
    policy: "隱私權條款"
  },
  "zh-Hans": {
    title: "FINORA 好好存",
    subtitle: "让资产更有力，退休不焦虑。",
    asset: "资产管理",
    compound: "复利试算",
    withdraw: "退休提领",
    emergency: "预备金试算",
    login: "🔐 使用 Google 账号登入",
    logout: "🚪 登出",
    accountLabel: "账本选择：",
    rename: "✏️",
    add: "➕",
    delete: "🗑️",
    privacy: "FINORA 重视隐私。你的资产，只属于你自己。",
    version: "v0.9 beta - 2025-05-29",
    footer: "© 2025 FINORA 好好存｜家庭友善资产整合工具",
    guide: "使用说明",
    contact: "联系我们",
    policy: "隐私权条款"
  },
  "en": {
    title: "FINORA Wealth",
    subtitle: "Make assets powerful. Retire without anxiety.",
    asset: "Asset Manager",
    compound: "Compound Growth",
    withdraw: "Retirement Withdrawals",
    emergency: "Emergency Fund",
    login: "🔐 Sign in with Google",
    logout: "🚪 Sign Out",
    accountLabel: "Select Account:",
    rename: "✏️",
    add: "➕",
    delete: "🗑️",
    privacy: "FINORA values your privacy. Your data belongs to you.",
    version: "v0.9 beta - 2025-05-29",
    footer: "© 2025 FINORA Wealth | Family-friendly asset tool",
    guide: "User Guide",
    contact: "Contact Us",
    policy: "Privacy Policy"
  },
  "ja": {
    title: "FINORA 資産管理",
    subtitle: "資産を強くし、安心して引退を。",
    asset: "資産管理",
    compound: "複利シミュレーション",
    withdraw: "退職引き出し",
    emergency: "緊急資金",
    login: "🔐 Googleでログイン",
    logout: "🚪 ログアウト",
    accountLabel: "帳簿選択：",
    rename: "✏️",
    add: "➕",
    delete: "🗑️",
    privacy: "FINORAはプライバシーを重視しています。資産はあなたのものです。",
    version: "v0.9 beta - 2025-05-29",
    footer: "© 2025 FINORA 資産統合ツール｜家族に優しい設計",
    guide: "使い方",
    contact: "お問い合わせ",
    policy: "プライバシーポリシー"
  }
};

function applyLang() {
  const lang = localStorage.getItem("lang") || "zh-Hant";
  const dict = translations[lang] || translations["zh-Hant"];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });
}

// ✅ 確保可從外部呼叫
window.applyLang = applyLang;
