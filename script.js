// ===== Part 1：初始化與查詢 =====

// 🔑 多語言處理
function i18n(key) {
  const lang = localStorage.getItem("lang") || "zh-Hant";
  return translations?.[lang]?.[key] || key;
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

// ✅ 匯率查詢（含 CNY 與 fallback）
async function fetchExchangeRates() {
  try {
    const res = await fetch("https://v6.exchangerate-api.com/v6/747171c8dd2eaa9173e2d890/latest/USD");
    const data = await res.json();

    if (data?.result !== "success") throw new Error("匯率查詢失敗");

    exchangeRates = {
      USD: 1,
      TWD: data.conversion_rates.TWD,
      JPY: data.conversion_rates.JPY,
      EUR: data.conversion_rates.EUR,
      CNY: data.conversion_rates.CNY
    };

    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
    localStorage.setItem("exchangeRatesTimestamp", Date.now());
    console.log("💱 匯率已更新：", exchangeRates);
  } catch (err) {
    console.error("❌ 匯率查詢錯誤：", err.message);

    // 嘗試使用 localStorage 備援
    const backup = localStorage.getItem("exchangeRates");
    if (backup) {
      exchangeRates = JSON.parse(backup);
      console.log("📦 使用備援匯率資料（localStorage）", exchangeRates);
    } else {
      // 最終預設值
      exchangeRates = {
        USD: 1,
        TWD: 32,
        JPY: 155,
        EUR: 1.08,
        CNY: 7.18
      };
      console.warn("📦 使用預設匯率資料", exchangeRates);
    }
  }

  render(); // 更新畫面
}

// ✅ 股票查價（美股 + 台股）
async function fetchStockPrice(symbol, category) {
  try {
    if (category === "美股") {
      const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=de909496c6754a89bc33db0306c2def8`);
      const data = await res.json();
      if (data && data.price) return parseFloat(data.price);
    } else if (category === "台股") {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${today}`);
      const data = await res.json();

      if (data.data && data.data.length > 0) {
        const latest = data.data.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        return latest.close;
      }
    }
  } catch (e) {
    console.warn("❌ " + i18n("stock_price_error") + "：" + e.message);
  }
  return null;
}

// ✅ 更新所有股票現價（含寫入與同步）
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
  if (!Array.isArray(assets)) return;
  if (!exchangeRates || Object.keys(exchangeRates).length === 0) return;
  if (!exchangeRates["TWD"]) return;

  assetList.innerHTML = "";
  totalsList.innerHTML = "";
  profitList.innerHTML = "";

  const totalsByType = {};
  const totalsByCurrency = {};
  const profitByTypeCurrency = {};

  for (const asset of assets) {
    const currency = asset.currency || "TWD";
    const type = asset.type || "其他";
    let value = 0;
    let cost = 0;

    if (!totalsByType[type]) totalsByType[type] = {};
    if (!totalsByCurrency[currency]) totalsByCurrency[currency] = 0;
    if (!totalsByType[type][currency]) totalsByType[type][currency] = 0;
    if (!profitByTypeCurrency[type]) profitByTypeCurrency[type] = {};
    if (!profitByTypeCurrency[type][currency]) profitByTypeCurrency[type][currency] = 0;

    if (type === "股票") {
      const shares = parseFloat(asset.shares || 0);
      const price = parseFloat(asset.price || 0);
      const costPerShare = parseFloat(asset.cost || 0);
      value = shares * price;
      cost = shares * costPerShare;
      profitByTypeCurrency[type][currency] += value - cost;
    } else if (type === "基金") {
      const units = parseFloat(asset.fundUnits || 0);
      const nav = parseFloat(asset.fundNav || 0);
      value = units * nav;
    } else if (type === "加密貨幣") {
      const amount = parseFloat(asset.cryptoAmount || 0);
      const price = parseFloat(asset.cryptoPrice || 0);
      value = amount * price;
    } else if (type === "儲蓄保險") {
      value = parseFloat(asset.insuranceAmount || 0);
    } else {
      value = parseFloat(asset.amount || 0);
    }

    totalsByType[type][currency] += value;
    totalsByCurrency[currency] += value;
  }

  // 資產項目列表顯示
  assets.forEach((asset, index) => {
    const li = document.createElement("li");
    li.className = "asset-item";

    const currency = asset.currency || "TWD";
    const type = asset.type || "其他";
    let text = `${i18n("option_" + type) || type}（${currency}）`;

    if (type === "股票") {
      text += ` - ${asset.stockSymbol || ""} ${asset.shares}股 成本 ${asset.cost}，現價 ${asset.price}`;
    } else if (type === "基金") {
      text += ` - ${asset.fundName || ""} ${asset.fundUnits}單位 × ${asset.fundNav}`;
    } else if (type === "加密貨幣") {
      text += ` - ${asset.cryptoSymbol || ""} ${asset.cryptoAmount} × ${asset.cryptoPrice}`;
    } else if (type === "儲蓄保險") {
      text += ` - ${asset.insuranceName || ""} 保額 ${asset.insuranceAmount}`;
    } else {
      text += ` - ${asset.amount || 0}`;
    }

    if (asset.note) text += ` ｜ ${asset.note}`;

    const btns = document.createElement("div");
    btns.style.display = "flex";
    btns.style.gap = "0.5rem";
    btns.innerHTML = `<button onclick="editAsset(${index})" class="action-button">✏️</button><button onclick="deleteAsset(${index})" class="action-button">🗑️</button>`;

    li.textContent = text;
    li.appendChild(btns);
    assetList.appendChild(li);
  });

  // 資產分類加總（依類別與幣別）
  for (const type in totalsByType) {
    for (const currency in totalsByType[type]) {
      const total = totalsByType[type][currency].toFixed(2);
      const li = document.createElement("li");

      const profit = profitByTypeCurrency?.[type]?.[currency] || 0;
      const profitText = profit !== 0 ? `（${i18n("profit")}：${profit.toFixed(2)} ${currency}）` : "";

      li.textContent = `📌 ${i18n("option_" + type)}：${total} ${currency} ${profitText}`;
      if (profit > 0) li.style.color = "green";
      if (profit < 0) li.style.color = "red";
      totalsList.appendChild(li);
    }
  }

  // 幣別加總與換算
  for (const currency in totalsByCurrency) {
    const total = totalsByCurrency[currency];
    const rateToTWD = exchangeRates[currency] ? (exchangeRates["TWD"] / exchangeRates[currency]) : 1;
    const converted = (total * rateToTWD).toFixed(0);
    const li = document.createElement("li");
    li.textContent = `💱 ${currency}：${total.toFixed(2)} ≈ NT$ ${converted}`;
    totalsList.appendChild(li);
  }

  // 顯示總資產（依使用者選擇的幣別）
  const selectedCurrency = localStorage.getItem("displayCurrency") || "TWD";
  const selectedRate = exchangeRates[selectedCurrency];

  if (!selectedRate || isNaN(selectedRate)) {
    console.error(`❌ 無效匯率：${selectedCurrency}`);
    alert(`⚠️ 無法取得 ${selectedCurrency} 的匯率，請稍後再試`);
    return;
  }

  let totalConverted = 0;

  for (const asset of assets) {
    let value = 0;
    if (asset.type === "股票") {
      value = parseFloat(asset.price || 0) * parseFloat(asset.shares || 0);
    } else if (asset.type === "基金") {
      value = parseFloat(asset.fundNav || 0) * parseFloat(asset.fundUnits || 0);
    } else if (asset.type === "加密貨幣") {
      value = parseFloat(asset.cryptoPrice || 0) * parseFloat(asset.cryptoAmount || 0);
    } else if (asset.type === "儲蓄保險") {
      value = parseFloat(asset.insuranceAmount || 0);
    } else {
      value = parseFloat(asset.amount || 0);
    }
    const rate = exchangeRates[asset.currency];
    if (!rate || isNaN(value)) continue;
    const converted = (asset.currency === selectedCurrency)
      ? value
      : value * (rate / selectedRate);
    totalConverted += converted;
  }

  const convertedLi = document.createElement("li");
  convertedLi.textContent = `💰 ${i18n("total_asset")}（${selectedCurrency}）：${totalConverted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${selectedCurrency}`;
  totalsList.appendChild(convertedLi);

  const now = new Date();
  const rateTime = document.getElementById("rate-time");
  if (rateTime) {
    rateTime.textContent = `${i18n("exchange_rate_updated")}：${now.toLocaleTimeString()}`;
  }
}

// ===== Part 4：編輯與刪除函式（請放在 render() 外部） =====
function editAsset(index) {
  const asset = assets[index];
  editIndex = index;
  typeSelect.value = asset.type;
  toggleFields();

  setTimeout(() => {
    if (asset.type === "股票") {
      document.getElementById("stock-symbol").value = asset.stockSymbol || asset.symbol || "";
      document.getElementById("stock-category").value = asset.stockCategory || asset.category || "";
      document.getElementById("stock-shares").value = asset.shares || 0;
      document.getElementById("stock-cost").value = asset.cost || 0;
      document.getElementById("stock-price").value = asset.price || 0;
    } else if (asset.type === "儲蓄保險") {
      document.getElementById("insurance-name").value = asset.insuranceName || "";
      document.getElementById("insurance-amount").value = asset.insuranceAmount || 0;
      document.getElementById("insurance-years").value = asset.insuranceYears || 0;
      document.getElementById("insurance-annual").value = asset.insuranceAnnual || 0;
    } else if (asset.type === "基金") {
      document.getElementById("fund-name").value = asset.fundName || "";
      document.getElementById("fund-units").value = asset.fundUnits || 0;
      document.getElementById("fund-nav").value = asset.fundNav || 0;
    } else if (asset.type === "加密貨幣") {
      document.getElementById("crypto-symbol").value = asset.cryptoSymbol || "";
      document.getElementById("crypto-amount").value = asset.cryptoAmount || 0;
      document.getElementById("crypto-price").value = asset.cryptoPrice || 0;
    } else {
      document.getElementById("amount").value = asset.amount || 0;
    }

    document.getElementById("currency").value = asset.currency || "TWD";
    document.getElementById("bank").value = asset.bank || "";
    document.getElementById("note").value = asset.note || "";
    document.getElementById("asset-form").scrollIntoView({ behavior: "smooth", block: "start" });

  }, 100);
  }

function deleteAsset(index) {
  const lang = localStorage.getItem("lang") || "zh-Hant";
  const msg = translations?.[lang]?.delete_confirm || "確定刪除這筆資產嗎？";
  if (!confirm(msg)) return;

  assets.splice(index, 1);
  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
  if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
    FINORA_AUTH.saveUserAssets(assets);
  }
  render();
}

function typeToKey(type) {
  switch (type) {
    case "股票": return "stock";
    case "定存": return "deposit";
    case "現金": return "cash";
    case "房產": return "property";
    case "儲蓄保險": return "insurance";
    case "基金": return "fund";
    case "加密貨幣": return "crypto";
    case "其他": return "other";
    default: return "other";
  }
}

// ===== Part 5：初始化與登入綁定（修正版） =====

document.addEventListener("DOMContentLoaded",async () => { 
  console.log("🔄 系統初始化中...");

// 🔧 綁定 DOM 元素 form = document.getElementById("asset-form"); typeSelect = document.getElementById("type"); stockFields = document.getElementById("stock-fields"); insuranceFields = document.getElementById("insurance-fields"); amountField = document.getElementById("amount-field"); assetList = document.getElementById("asset-list"); totalsList = document.getElementById("totals-list"); profitList = document.getElementById("stock-profit-list"); bankDatalist = document.getElementById("bank-list");

// 🈯️ 套用語系 if (typeof applyLang === "function") applyLang();

// 🔑 顯示幣別選單（總資產計價幣別） const displayCurrencySelect = document.getElementById("display-currency"); if (displayCurrencySelect) { const savedDisplayCurrency = localStorage.getItem("displayCurrency") || "TWD"; displayCurrencySelect.value = savedDisplayCurrency; displayCurrencySelect.addEventListener("change", () => { localStorage.setItem("displayCurrency", displayCurrencySelect.value); render(); }); }

// 🧩 Firebase 登入後開始載入資料 FINORA_AUTH.onUserChanged(async (user) => { const emailEl = document.getElementById("auth-email"); const accountEl = document.getElementById("account-name"); const MAX_ACCOUNT_COUNT = 3;

if (!user) {
  if (emailEl) emailEl.textContent = i18n("not_logged_in");
  if (accountEl) accountEl.textContent = i18n("no_account_selected");
  alert(i18n("please_login_first"));
  return;
}

try {
  const selectedId = localStorage.getItem("selectedAccount");
  const list = await FINORA_AUTH.fetchAccountList();
  let selected = list.find(acc => acc.id === selectedId);

  if (!selected && list.length > 0) {
    selected = list[0];
    localStorage.setItem("selectedAccount", selected.id);
    console.warn("⚠️ 找不到帳本，自動切換為第一本帳本：", selected.id);
  } else if (!selected) {
    alert(i18n("no_account_warning"));
    window.location.href = "../app.html";
    return;
  }

  const displayName = selected.displayName || selected.id;
  if (emailEl) emailEl.textContent = user.email;
  if (accountEl) accountEl.textContent = `${displayName}（${list.length} / ${MAX_ACCOUNT_COUNT}）`;

  // 🔗 表單欄位監聽
  if (form) form.addEventListener("submit", handleSubmit);
  if (typeSelect) typeSelect.addEventListener("change", toggleFields);

  // 📘 銀行選單
  if (bankDatalist) {
    bankDatalist.innerHTML = "";
    bankHistory.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      bankDatalist.appendChild(opt);
    });
  }

  // 📈 股票查價
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

  // 💰 加密貨幣查價
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

  // 📊 載入匯率與資產
  await fetchExchangeRates();
  await updateAllStockPrices();

  // 🧾 重新讀入資產
  assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");
  if (!Array.isArray(assets)) assets = [];

  toggleFields();
  render();
  applyLang();
  console.log("✅ 初始化完成");
} catch (e) {
  console.error("❌ 初始化失敗", e);
  alert(i18n("init_error") || "初始化失敗");
}

}); // 👈 關閉 FINORA_AUTH.onUserChanged
}); // 👈 關閉 DOMContentLoaded

