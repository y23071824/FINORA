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
let exchangeRatesLoaded = false;
let editIndex = null;

// ✅ DOM 元素定義（稍後啟動流程會綁定）
let form, typeSelect, stockFields, insuranceFields, amountField;
let assetList, totalsList, profitList, bankDatalist;

// ✅ 匯率查詢主函式（含 fallback 與備援）
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
    console.log("💱 " + i18n("exchange_rate_updated") + "：", exchangeRates);
  } catch (err) {
    console.error("❌ " + i18n("exchange_rate_error") + "：" + err.message);

    const backup = localStorage.getItem("exchangeRates");
    if (backup) {
      exchangeRates = JSON.parse(backup);
      console.log("📦 " + i18n("using_backup_rates"), exchangeRates);
    } else {
      exchangeRates = {
        USD: 1,
        TWD: 32,
        JPY: 155,
        EUR: 1.08,
        CNY: 7.18
      };
      console.warn("📦 " + i18n("using_default_rates"), exchangeRates);
    }
  }
}


// ✅ 匯率查詢（只執行一次）
async function fetchExchangeRatesOnce() {
  function isExchangeRateExpired() {
    const ts = localStorage.getItem("exchangeRatesTimestamp");
    if (!ts) return true; // 沒存過就當作過期
    const lastFetched = parseInt(ts);
    const now = Date.now();
    return now - lastFetched > 24 * 60 * 60 * 1000; // 超過一天就過期
  }

  const stored = localStorage.getItem("exchangeRates");
  const expired = isExchangeRateExpired();

  if (stored && !expired) {
    exchangeRates = JSON.parse(stored);
    console.log("📦 使用已存在匯率（未過期）：", exchangeRates);
    return;
  }

  console.log("⏰ 匯率過期或未存在，開始查詢...");
  await fetchExchangeRates();
}

// ✅ 股票查價（美股 + 台股）
async function fetchStockPrice(symbol, category) {
  try {
    if (category === "美股") {
      const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=de909496c6754a89bc33db0306c2def8`);
      const data = await res.json();
      if (data && data.price) {
        return parseFloat(data.price);
      }
    } else if (category === "台股") {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const startDate = sevenDaysAgo.toISOString().slice(0, 10);
      const endDate = today.toISOString().slice(0, 10);

      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${startDate}&end_date=${endDate}`);
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
const propertyFields = document.getElementById("property-fields");
if (propertyFields) propertyFields.style.display = type === "房產" ? "block" : "none";

  amountField.style.display = ["定存", "現金", "其他"].includes(type) ? "block" : "none";
}

// ✅ 儲存資產表單資料
async function handleSubmit(e) {
  e.preventDefault();
 // 1. 更新銀行記憶
  const bankName = document.getElementById("bank").value.trim();
  if (bankName && !bankHistory.includes(bankName)) {
    bankHistory.push(bankName);
    localStorage.setItem("banks", JSON.stringify(bankHistory));
  }

  // 2. ... 接著處理你的資產資料邏輯
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
        symbol,
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
        cryptoCost: parseFloat(document.getElementById("crypto-cost").value) || 0,
      };
      } else if (type === "房產") {
  newAsset = {
    ...newAsset,
    name: document.getElementById("property-name")?.value.trim(),
    amount: parseFloat(document.getElementById("amount")?.value) || 0,
    mortgage: parseFloat(document.getElementById("mortgage")?.value) || 0,
    interestRate: parseFloat(document.getElementById("interest-rate")?.value) || 0,
    yearsRemaining: parseInt(document.getElementById("years-remaining")?.value) || 0
  };
    } else {
      newAsset.amount = parseFloat(document.getElementById("amount")?.value) || 0;
    }

    // 共同欄位
    newAsset.bank = document.getElementById("bank")?.value || "";
    newAsset.note = document.getElementById("note")?.value || "";

    // 檢查是否重複
    const isDuplicate = editIndex === null && assets.some(a => JSON.stringify(a) === JSON.stringify(newAsset));
    if (isDuplicate) {
      alert("⚠️ 相同資產已存在，請勿重複新增！");
      return;
    }

    // 編輯或新增
    if (editIndex !== null) {
      assets[editIndex] = newAsset;
      editIndex = null;
    } else {
      assets.push(newAsset);
    }

    // 銀行記憶
    const bankName = newAsset.bank;
    if (bankName && !bankHistory.includes(bankName)) {
      bankHistory.push(bankName);
      localStorage.setItem("banks", JSON.stringify(bankHistory));
    }

    // 儲存
    localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
    if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
      await FINORA_AUTH.saveUserAssets(assets);
    }

    form.reset();
    toggleFields();
    render();
    console.log("✅ 資產已儲存，總筆數：", assets.length);

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
  const profitsByType = {}; 
  const currencyTotals = {};

  for (const asset of assets) {
    const currency = asset.currency || "TWD";
    const type = asset.type || "其他";
    let value = 0;
    let cost = 0;

    if (!totalsByType[type]) totalsByType[type] = {};
    if (!totalsByType[type][currency]) totalsByType[type][currency] = 0;
    if (!totalsByCurrency[currency]) totalsByCurrency[currency] = 0;
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
      value = parseFloat(asset.fundUnits || 0) * parseFloat(asset.fundNav || 0);
    } else if (type === "加密貨幣") {
      const amount = parseFloat(asset.cryptoAmount || 0);
      const price = parseFloat(asset.cryptoPrice || 0);
      const costPerUnit = parseFloat(asset.cryptoCost || 0);
      value = amount * price;
      cost = amount * costPerUnit;
      profitByTypeCurrency[type][currency] += value - cost;
    } else if (type === "儲蓄保險") {
      value = parseFloat(asset.insuranceAmount || 0);
    } else {
      value = parseFloat(asset.amount || 0);
    }

    totalsByType[type][currency] += value;
    totalsByCurrency[currency] += value;
  }

  // 顯示各筆資產
  assets.forEach((asset, index) => {
    const li = document.createElement("li");
    li.className = "asset-item";
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";

    const currency = asset.currency || "TWD";
    const type = asset.type || "其他";
    let text = `${i18n("option_" + type) || type}（${currency}）`;
    const details = [];
    let totalValue = 0;

    if (type === "股票") {
      const shares = parseFloat(asset.shares || 0);
      const price = parseFloat(asset.price || 0);
      const cost = parseFloat(asset.cost || 0);
      totalValue = shares * price;
      const profit = totalValue - shares * cost;
      if (asset.stockSymbol) details.push(`${asset.stockSymbol}`);
      if (asset.shares) details.push(`${shares}${i18n("unit_share") || "股"}`);
      if (asset.cost) details.push(`${i18n("cost")}：${cost}`);
      details.push(`${i18n("label_price")}：${price}`);
      if (!isNaN(profit)) details.push(`💹 ${i18n("profit")}：${profit.toLocaleString()} ${currency}`);
      details.push(`${i18n("market_value")}：${totalValue.toLocaleString()} ${currency}`);
    } else if (type === "基金") {
      const units = parseFloat(asset.fundUnits || 0);
      const nav = parseFloat(asset.fundNav || 0);
      totalValue = units * nav;
      if (asset.fundName) details.push(`${i18n("label_fund_name") || "基金名稱"}：${asset.fundName}`);
      details.push(`${i18n("label_fund_units")}：${units}`);
      details.push(`${i18n("label_fund_nav")}：${nav}`);
      details.push(`💰 ${i18n("total")}：${totalValue.toLocaleString()} ${currency}`);
    } else if (type === "加密貨幣") {
      const amount = parseFloat(asset.cryptoAmount || 0);
      const price = parseFloat(asset.cryptoPrice || 0);
      const cost = parseFloat(asset.cryptoCost || 0);
      totalValue = amount * price;
      const profit = totalValue - amount * cost;
      details.push(`${i18n("label_crypto_symbol")}：${asset.cryptoSymbol}`);
      details.push(`${i18n("label_crypto_amount")}：${amount}`);
      details.push(`${i18n("label_crypto_price")}：${price}`);
      if (asset.cryptoCost) details.push(`${i18n("cost")}：${cost}`);
      if (!isNaN(profit)) details.push(`💹 ${i18n("profit")}：${profit.toLocaleString()} ${currency}`);
      details.push(`💰 ${i18n("total")}：${totalValue.toLocaleString()} ${currency}`);
    } else if (type === "儲蓄保險") {
      if (asset.insuranceName) details.push(`${i18n("label_policy_name")}：${asset.insuranceName}`);
      if (asset.insuranceAmount) details.push(`${i18n("insured_amount")}：${asset.insuranceAmount}`);
      if (asset.insuredYears) details.push(`${i18n("insured_years")}：${asset.insuredYears}`);
      if (asset.annualPremium) details.push(`${i18n("annual_premium")}：${asset.annualPremium}`);
   } else {
  if (asset.amount) {
    totalValue = parseFloat(asset.amount);
    details.push(`${i18n("label_amount")}：${totalValue.toLocaleString()} ${currency}`);
  }

  // 房產延伸細節
  if (type === "房產") {
    if (asset.name) details.unshift(`${i18n("label_property_name")}：${asset.name}`);
    if (asset.mortgage) details.push(`${i18n("label_mortgage_balance")}：${asset.mortgage.toLocaleString()} ${currency}`);
    if (asset.interestRate) details.push(`${i18n("label_interest_rate")}：${asset.interestRate}%`);
    if (asset.yearsRemaining) details.push(`${i18n("label_years_remaining")}：${asset.yearsRemaining}${i18n("unit_years") || "年"}`);
  }
}


    if (asset.bank) details.push(`${i18n("label_bank")}：${asset.bank}`);
    if (asset.note) details.push(`${i18n("label_note")}：${asset.note}`);
    if (details.length > 0) text += ` - ${details.join(" ｜ ")}`;

    const textDiv = document.createElement("div");
    textDiv.textContent = text;
    textDiv.style.flex = "1";

    const btns = document.createElement("div");
    btns.style.display = "flex";
    btns.style.flexDirection = "column";
    btns.style.gap = "0.25rem";
    btns.style.flexShrink = "0";
    btns.innerHTML = `
      <button onclick="editAsset(${index})" class="action-button">✏️</button>
      <button onclick="deleteAsset(${index})" class="action-button">🗑️</button>
    `;

    li.appendChild(textDiv);
    li.appendChild(btns);
    assetList.appendChild(li);
  });

  // 資產分類加總顯示
  for (const type in totalsByType) {
    for (const currency in totalsByType[type]) {
      const total = totalsByType[type][currency].toFixed(2);
      const profit = profitByTypeCurrency?.[type]?.[currency] || 0;
      const profitText = profit !== 0 ? `（${i18n("profit")}：${profit.toFixed(2)} ${currency}）` : "";
      const li = document.createElement("li");
      li.textContent = `📌 ${i18n("option_" + type)}：${total} ${currency} ${profitText}`;
      if (profit > 0) li.style.color = "green";
      if (profit < 0) li.style.color = "red";
      totalsList.appendChild(li);
    }
  }

  // 顯示總資產（折算為選擇幣別）
  const selectedCurrency = localStorage.getItem("displayCurrency") || "TWD";
  const selectedRate = exchangeRates[selectedCurrency];
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

    const assetRate = exchangeRates[asset.currency];
    if (!assetRate || isNaN(value)) continue;
    const converted = value * (selectedRate / assetRate);
    totalConverted += converted;
  }

  const convertedLi = document.createElement("li");
  convertedLi.textContent = `💰 ${i18n("total_asset")}（${selectedCurrency}）：${totalConverted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${selectedCurrency}`;
  totalsList.appendChild(convertedLi);

 const assetBreakdown = {
  summary: totalsByType,
  profits: profitByTypeCurrency, // 若你未來需要呈現分類盈餘，這個可用
  totals: totalsByCurrency,
  totalConverted: totalConverted,
  selectedCurrency: selectedCurrency
};

localStorage.setItem(`assets_breakdown_${getSelectedAccount()}`, JSON.stringify(assetBreakdown));


  // 匯率更新時間
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

// ===== Part 5：初始化與登入繫定（修正版） =====

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔁 系統初始化中...");

  // 🔧 繫定 DOM 元素
  form = document.getElementById("asset-form");
  typeSelect = document.getElementById("type");
  stockFields = document.getElementById("stock-fields");
  insuranceFields = document.getElementById("insurance-fields");
  amountField = document.getElementById("amount-field");
  assetList = document.getElementById("asset-list");
  totalsList = document.getElementById("totals-list");
  profitList = document.getElementById("stock-profit-list");
  bankDatalist = document.getElementById("bank-list");

  // 🇾️ 套用語系
  if (typeof applyLang === "function") applyLang();

  // 🔑 顯示幣別選單（總資產計價幣別）
  const displayCurrencySelect = document.getElementById("display-currency");
  if (displayCurrencySelect) {
    const savedDisplayCurrency = localStorage.getItem("displayCurrency") || "TWD";
    displayCurrencySelect.value = savedDisplayCurrency;
    displayCurrencySelect.addEventListener("change", () => {
      localStorage.setItem("displayCurrency", displayCurrencySelect.value);
      render();
    });
  }

  // 🧹 Firebase 登入後開始載入資料
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

      const symbolToIdMap = {
        btc: "bitcoin",
        eth: "ethereum",
        usdt: "tether",
        bnb: "binancecoin",
        sol: "solana",
        ada: "cardano",
        xrp: "ripple",
        doge: "dogecoin",
        dot: "polkadot",
        avax: "avalanche"
      };

      if (cryptoSymbolInput && cryptoPriceInput) {
        cryptoSymbolInput.addEventListener("blur", async () => {
          const symbol = cryptoSymbolInput.value.trim().toLowerCase();
          const id = symbolToIdMap[symbol];
          if (!id) return;

          try {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
            const data = await res.json();
            const price = data[id]?.usd;
            if (price) {
              cryptoPriceInput.value = price;
              console.log(`✅ ${symbol.toUpperCase()} 現價：${price} USD`);
            }
          } catch (e) {
            console.error("❌ 加密貨幣查詢失敗", e);
          }
        });
      }

      // 📊 載入匯率與資產
      await fetchExchangeRatesOnce();
      await updateAllStockPrices();

      // 🗒️ 重新讀入資產
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
  });
});
