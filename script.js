// ===== Part 1：初始化與查詢 =====

// 🔑 多語言處理
function i18n(key) {
  const lang = localStorage.getItem("lang") || "zh-Hant";
  return translations?.[lang]?.[key] || key;
}

// ✅ 幣別名稱翻譯
function i18nCurrency(code) {
  const currencyNames = {
    TWD: i18n("currency_twd"),
    USD: i18n("currency_usd"),
    JPY: i18n("currency_jpy"),
    EUR: i18n("currency_eur"),
    CNH: i18n("currency_cnh"),
  };
  return currencyNames[code] || code;
}

// ✅ 帳本選擇與 LocalStorage Key
function getSelectedAccount() {
  return localStorage.getItem("selectedAccount") || "default";
}
function getLocalStorageKey() {
  return `assets_${getSelectedAccount()}`;
}

// ✅ 初始化變數
let assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");
let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");
let exchangeRates = {};
let editIndex = null;

// ✅ DOM 元素定義（稍後啟動流程會綁定）
let form, typeSelect, stockFields, insuranceFields, amountField;
let assetList, totalsList, profitList, bankDatalist;

// ✅ 匯率查詢（新增 CNH）
async function fetchExchangeRates() {
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=TWD,JPY,EUR,CNH");
    const data = await res.json();
    if (!data || !data.rates) throw new Error("❌ " + i18n("invalid_exchange_data"));

    exchangeRates = {
      USD: 1,
      TWD: data.rates.TWD || 30,
      JPY: data.rates.JPY || 150,
      EUR: data.rates.EUR || 0.9,
      CNH: data.rates.CNH || 7,
    };
    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
  } catch (e) {
    console.warn("⚠️ " + i18n("exchange_failed") + "：" + e.message);
    const saved = localStorage.getItem("exchangeRates");
    if (saved) {
      exchangeRates = JSON.parse(saved);
    } else {
      exchangeRates = { USD: 1, TWD: 30, JPY: 150, EUR: 0.9, CNH: 7 };
    }
  }
}

// ✅ 更新所有股票現價（支援美股與台股）
async function updateAllStockPrices() {
  const updatedAssets = [];

  for (let asset of assets) {
    if (asset.type === "股票" && asset.stockSymbol && asset.stockCategory) {
      const price = await fetchStockPrice(asset.stockSymbol, asset.stockCategory);
      if (price !== null) asset.price = price;
    }
    updatedAssets.push(asset);
  }

  assets = updatedAssets;
  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
  if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
    await FINORA_AUTH.saveUserAssets(assets);
  }
}

// ✅ 股票查價（TwelveData / 台股 Yahoo）
async function fetchStockPrice(symbol, category) {
  try {
    if (category === "美股") {
      const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=你的API金鑰`);
      const data = await res.json();
      if (data && data.price) return parseFloat(data.price);
    } else if (category === "台股") {
      const res = await fetch(`https://tw.stock.yahoo.com/q/q?s=${symbol}`);
      const text = await res.text();
      const match = text.match(/<b>\d+\.\d+<\/b>/);
      if (match) return parseFloat(match[0].replace(/<[^>]+>/g, ""));
    }
  } catch (e) {
    console.warn("❌ " + i18n("stock_price_error") + "：" + e.message);
  }
  return null;
}

// ===== Part 2：表單處理與存儲 =====

// ✅ 切換表單欄位顯示（根據種類）
function toggleFields() {
  const type = typeSelect?.value;
  if (!typeSelect || !stockFields || !insuranceFields || !amountField) return;

  stockFields.style.display = type === "股票" ? "block" : "none";
  insuranceFields.style.display = type === "儲蓄保險" ? "block" : "none";

  const fundFields = document.getElementById("fund-fields");
  const cryptoFields = document.getElementById("crypto-fields");

  if (fundFields) fundFields.style.display = type === "基金" ? "block" : "none";
  if (cryptoFields) cryptoFields.style.display = type === "加密貨幣" ? "block" : "none";

  amountField.style.display = ["定存", "現金", "房產", "其他"].includes(type) ? "block" : "none";
}

// ✅ 儲存資產表單資料
async function handleSubmit(e) {
  e.preventDefault();

  const type = typeSelect?.value;
  const currency = document.getElementById("currency")?.value || "TWD";
  let newAsset = { type, currency };

  try {
    if (type === "股票") {
      const symbol = document.getElementById("stock-symbol")?.value.trim();
      newAsset = {
        ...newAsset,
        stockCategory: document.getElementById("stock-category")?.value,
        stockSymbol: symbol,
        symbol, // 舊欄位保留相容性
        shares: parseFloat(document.getElementById("stock-shares")?.value) || 0,
        cost: parseFloat(document.getElementById("stock-cost")?.value) || 0,
        price: parseFloat(document.getElementById("stock-price")?.value) || 0,
      };
    } else if (type === "儲蓄保險") {
      newAsset = {
        ...newAsset,
        insuranceName: document.getElementById("insurance-name")?.value,
        insuranceAmount: parseFloat(document.getElementById("insurance-amount")?.value) || 0,
        insuranceYears: parseInt(document.getElementById("insurance-years")?.value) || 0,
        insuranceAnnual: parseFloat(document.getElementById("insurance-annual")?.value) || 0,
      };
    } else if (type === "基金") {
      newAsset = {
        ...newAsset,
        fundName: document.getElementById("fund-name")?.value,
        fundUnits: parseFloat(document.getElementById("fund-units")?.value) || 0,
        fundNav: parseFloat(document.getElementById("fund-nav")?.value) || 0,
      };
    } else if (type === "加密貨幣") {
      const symbol = document.getElementById("crypto-symbol")?.value.toLowerCase();
      newAsset = {
        ...newAsset,
        cryptoSymbol: symbol,
        cryptoAmount: parseFloat(document.getElementById("crypto-amount")?.value) || 0,
        cryptoPrice: parseFloat(document.getElementById("crypto-price")?.value) || 0,
      };
    } else {
      newAsset.amount = parseFloat(document.getElementById("amount")?.value) || 0;
    }

    // 共同欄位處理
    newAsset.bank = document.getElementById("bank")?.value || "";
    newAsset.note = document.getElementById("note")?.value || "";

    // 編輯或新增
    if (editIndex !== null) {
      assets[editIndex] = newAsset;
      editIndex = null;
    } else {
      assets.push(newAsset);
    }

    // 銀行名稱記憶
    const bankName = newAsset.bank;
    if (bankName && !bankHistory.includes(bankName)) {
      bankHistory.push(bankName);
      localStorage.setItem("banks", JSON.stringify(bankHistory));
    }

    // 儲存本地與雲端
    localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
    if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
      await FINORA_AUTH.saveUserAssets(assets);
    }

    form.reset();
    toggleFields();
    render();
  } catch (e) {
    console.error("❌ 表單儲存錯誤", e);
    alert(i18n("input_error") || "輸入錯誤，請檢查欄位");
  }
}


// ===== Part 3：畫面渲染與計算 =====
function render() {
  assetList.innerHTML = "";
  totalsList.innerHTML = "";
  profitList.innerHTML = "";

  let totalsByType = {};
  let totalsByCurrency = {};
  let totalTWD = 0;

  const lang = localStorage.getItem("lang") || "zh-Hant";
  const displayCurrency = (code) => {
    const labels = {
      "TWD": { "zh-Hant": "台幣", "zh-Hans": "新台币", "en": "TWD", "ja": "台湾元", "CN": "人民币" },
      "USD": { "zh-Hant": "美金", "zh-Hans": "美元", "en": "USD", "ja": "米ドル", "CN": "美元" },
      "JPY": { "zh-Hant": "日圓", "zh-Hans": "日元", "en": "JPY", "ja": "円", "CN": "日元" },
      "CN":  { "zh-Hant": "人民幣", "zh-Hans": "人民币", "en": "CNY", "ja": "人民元", "CN": "人民币" },
      "EUR": { "zh-Hant": "歐元", "zh-Hans": "欧元", "en": "EUR", "ja": "ユーロ", "CN": "欧元" },
    };
    return labels[code]?.[lang] || code;
  };

  assets.forEach((asset, index) => {
    const li = document.createElement("li");
    li.className = "asset-item";

    let value = 0;
    let cost = 0;
    let display = "";
    let text = `📌 ${i18n(asset.type) || asset.type}`;

    if (asset.type === "股票") {
      const { stockSymbol = asset.symbol || "?", shares = 0, cost: c = 0, price = 0 } = asset;
      const market = shares * price;
      const totalCost = shares * c;
      const profit = market - totalCost;
      value = market;
      cost = totalCost;
      display = `${stockSymbol} × ${shares}｜${i18n("cost")} ${totalCost.toFixed(2)}｜${i18n("current_price")} ${price}｜${i18n("market_value")} ${market.toFixed(2)}｜${i18n("profit")} ${profit.toFixed(2)}`;
    } else if (asset.type === "儲蓄保險") {
      const { insuranceName = "", insuranceAmount = 0, insuranceYears = 0, insuranceAnnual = 0 } = asset;
      value = insuranceAmount;
      display = `${insuranceName}｜保額 ${insuranceAmount}｜年期 ${insuranceYears}｜年繳 ${insuranceAnnual}`;
    } else if (asset.type === "基金") {
      const { fundName = "", fundUnits = 0, fundNav = 0 } = asset;
      value = fundUnits * fundNav;
      display = `${fundName} × ${fundUnits}｜淨值 ${fundNav}｜市值 ${value.toFixed(2)}`;
    } else if (asset.type === "加密貨幣") {
      const { cryptoSymbol = "", cryptoAmount = 0, cryptoPrice = 0 } = asset;
      value = cryptoAmount * cryptoPrice;
      display = `${cryptoSymbol.toUpperCase()} × ${cryptoAmount}｜現價 ${cryptoPrice}｜市值 ${value.toFixed(2)}`;
    } else {
      value = asset.amount || 0;
      display = `${asset.note || ""}｜金額 ${value}`;
    }

    const currency = asset.currency || "TWD";
    const rate = exchangeRates[currency] || 1;
    const converted = value * rate;
    totalTWD += converted;

    totalsByType[asset.type] ??= {};
    totalsByType[asset.type][currency] ??= 0;
    totalsByType[asset.type][currency] += value;

    totalsByCurrency[currency] ??= 0;
    totalsByCurrency[currency] += value;

    li.innerHTML = `
      <div>${text}</div>
      <div class="note">${display}</div>
      <div class="actions">
        <button onclick="editAsset(${index})">✏️</button>
        <button onclick="deleteAsset(${index})">🗑️</button>
      </div>
    `;
    assetList.appendChild(li);
  });

  // 類別加總
  for (const type in totalsByType) {
    for (const currency in totalsByType[type]) {
      const total = totalsByType[type][currency].toFixed(2);
      const li = document.createElement("li");
      li.textContent = `📌 ${i18n(type)}：${total} ${displayCurrency(currency)}`;
      totalsList.appendChild(li);
    }
  }

  // 幣別加總
  for (const currency in totalsByCurrency) {
    const total = totalsByCurrency[currency];
    const rate = exchangeRates[currency] || 1;
    const converted = (total * rate).toFixed(0);
    const li = document.createElement("li");
    li.textContent = `💱 ${displayCurrency(currency)}：${total.toFixed(2)} ≈ NT$ ${converted}`;
    totalsList.appendChild(li);
  }

  // 自選幣別總資產
  const selectedCurrency = document.getElementById("summary-currency")?.value || "TWD";
  const selectedRate = exchangeRates[selectedCurrency] || 1;
  const totalConverted = (totalTWD / selectedRate).toFixed(2);
  const totalDisplay = displayCurrency(selectedCurrency);
  const totalLi = document.createElement("li");
  totalLi.textContent = `💰 ${i18n("total_asset")}：${totalDisplay} ${totalConverted}`;
  totalsList.appendChild(totalLi);

  // 匯率更新時間顯示
  const now = new Date();
  const rateTime = document.getElementById("rate-time");
  if (rateTime) {
    rateTime.textContent = `${i18n("exchange_rate_updated")}：${now.toLocaleTimeString()}`;
  }
}

// ===== Part 4：啟動函式與登入綁定 =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔄 系統初始化中...");
  const lang = localStorage.getItem("lang") || "zh-Hant";

  // Firebase 登入狀態監聽
  FINORA_AUTH.onUserChanged(async (user) => {
    const emailEl = document.getElementById("auth-email");
    const accountEl = document.getElementById("account-name");
    const MAX_ACCOUNT_COUNT = 3;

    if (!user) {
      if (emailEl) emailEl.textContent = i18n("not_logged_in");
      if (accountEl) accountEl.textContent = i18n("no_account_selected");
      alert(i18n("please_login_first"));
      return;
    }

    try {
      // 元素綁定
      form = document.getElementById("asset-form");
      typeSelect = document.getElementById("type");
      stockFields = document.getElementById("stock-fields");
      insuranceFields = document.getElementById("insurance-fields");
      amountField = document.getElementById("amount-field");
      assetList = document.getElementById("asset-list");
      totalsList = document.getElementById("totals-list");
      profitList = document.getElementById("stock-profit-list");
      bankDatalist = document.getElementById("bank-list");

      // 顯示帳戶資訊
      const accountId = getSelectedAccount();
      const list = await FINORA_AUTH.fetchAccountList();
      const displayName = list.find(acc => acc.id === accountId)?.displayName || accountId;
      if (emailEl) emailEl.textContent = user.email;
      if (accountEl) accountEl.textContent = `${displayName}（${list.length} / ${MAX_ACCOUNT_COUNT}）`;

      // 表單與欄位監聽
      if (form) form.addEventListener("submit", handleSubmit);
      if (typeSelect) typeSelect.addEventListener("change", toggleFields);

      // 銀行選單
      bankDatalist.innerHTML = "";
      bankHistory.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        bankDatalist.appendChild(opt);
      });

      // 股票查價
      const stockSymbolInput = document.getElementById("stock-symbol");
      const stockCategoryInput = document.getElementById("stock-category");
      const stockPriceInput = document.getElementById("stock-price");
      if (stockSymbolInput && stockCategoryInput && stockPriceInput) {
        stockSymbolInput.addEventListener("blur", async () => {
          const symbol = stockSymbolInput.value.trim();
          const category = stockCategoryInput.value;
          if (!symbol || !category) return;
          const price = await fetchStockPrice(symbol, category);
          if (price !== null) stockPriceInput.value = price;
        });
      }

      // 加密貨幣查價
      const cryptoSymbolInput = document.getElementById("crypto-symbol");
      const cryptoPriceInput = document.getElementById("crypto-price");
      if (cryptoSymbolInput && cryptoPriceInput) {
        cryptoSymbolInput.addEventListener("blur", async () => {
          const symbol = cryptoSymbolInput.value.trim().toLowerCase();
          if (!symbol) return;
          try {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`);
            const data = await res.json();
            const price = data[symbol]?.usd;
            if (price) cryptoPriceInput.value = price;
          } catch (e) {
            console.error("❌ 加密貨幣查詢失敗", e);
          }
        });
      }

      // 🔁 初始化流程
      await fetchExchangeRates();
      await updateAllStockPrices();

      // 重新載入資產（避免未更新）
      assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");

      toggleFields();
      render();
      applyLang();

      console.log("✅ 初始化完成");

    } catch (e) {
      console.error("❌ 初始化失敗", e);
      alert(i18n("init_error") || "系統初始化錯誤，請重新整理頁面");
    }
  });
});

