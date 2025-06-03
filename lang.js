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
    save: "儲存",
    edit: "編輯",
    back: "返回首頁",
    amount: "金額",
    currency: "幣別",
    bank: "銀行名稱",
    note: "備註",
    type: "資產種類",
    stock: "股票",
    insurance: "儲蓄保險",
    fund: "基金",
    crypto: "加密貨幣",
    deposit: "定存",
    cash: "現金",
    realestate: "房產",
    other: "其他",
    totalAsset: "總資產（折合台幣）",
    totalValue: "市值加總",
    totalProfit: "盈餘",
    profit: "盈餘",
    totalByCurrency: "幣別總額",
    totalByType: "資產分類總額",
    privacy: "FINORA 重視隱私。你的資產，只屬於你自己。",
    version: "v0.9 beta - 2025-05-29",
    footer: "© 2025 FINORA 好好存｜家庭友善資產整合工具"
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
    save: "储存",
    edit: "编辑",
    back: "返回首页",
    amount: "金额",
    currency: "币别",
    bank: "银行名称",
    note: "备注",
    type: "资产种类",
    stock: "股票",
    insurance: "储蓄保险",
    fund: "基金",
    crypto: "加密货币",
    deposit: "定存",
    cash: "现金",
    realestate: "房产",
    other: "其他",
    totalAsset: "总资产（折合台币）",
    totalValue: "市值加总",
    totalProfit: "盈余",
    profit: "盈余",
    totalByCurrency: "币别总额",
    totalByType: "资产分类总额",
    privacy: "FINORA 重视隐私。你的资产，只属于你自己。",
    version: "v0.9 beta - 2025-05-29",
    footer: "© 2025 FINORA 好好存｜家庭友善资产整合工具"
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
    save: "Save",
    edit: "Edit",
    back: "Back to Home",
    amount: "Amount",
    currency: "Currency",
    bank: "Bank Name",
    note: "Note",
    type: "Asset Type",
    stock: "Stock",
    insurance: "Insurance",
    fund: "Fund",
    crypto: "Crypto",
    deposit: "Deposit",
    cash: "Cash",
    realestate: "Real Estate",
    other: "Other",
    totalAsset: "Total Asset (TWD)",
    totalValue: "Total Market Value",
    totalProfit: "Total Profit",
    profit: "Profit",
    totalByCurrency: "Total by Currency",
    totalByType: "Total by Asset Type",
    privacy: "FINORA values your privacy. Your data belongs to you.",
    version: "v0.9 beta - 2025-05-29",
    footer: "© 2025 FINORA Wealth | Family-friendly asset tool"
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
    save: "保存",
    edit: "編集",
    back: "ホームへ戻る",
    amount: "金額",
    currency: "通貨",
    bank: "銀行名",
    note: "備考",
    type: "資産の種類",
    stock: "株式",
    insurance: "保険",
    fund: "ファンド",
    crypto: "暗号資産",
    deposit: "定期預金",
    cash: "現金",
    realestate: "不動産",
    other: "その他",
    totalAsset: "総資産（TWD換算）",
    totalValue: "時価総額",
    totalProfit: "総利益",
    profit: "利益",
    totalByCurrency: "通貨別合計",
    totalByType: "資産分類別合計",
    privacy: "FINORAはプライバシーを重視しています。資産はあなたのものです。",
    version: "v0.9 beta - 2025-05-29",
    footer: "© 2025 FINORA 資産統合ツール｜家族に優しい設計"
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

window.applyLang = applyLang;


---

✅ 接下來你可以這樣用：

在 assets.html 中，把對應文字加上 data-i18n 屬性，例如：

<label data-i18n="type">資產種類</label>
<label data-i18n="amount">金額</label>
<button data-i18n="save">儲存</button>

