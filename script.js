// ===== Part 1：初始化與查詢 =====

// ✅ 帳本選擇與 LocalStorage Key 取得
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

// ✅ DOM 元素定義
let form, typeSelect, stockFields, insuranceFields, amountField;
let assetList, totalsList, profitList, bankDatalist;

// ===== 匯率查詢 =====
async function fetchExchangeRates() {
  const status = document.getElementById("exchange-status");
  try {
    if (status) status.textContent = "📡 查詢最新匯率中...";
    
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=TWD,JPY,EUR");
    const data = await res.json();

    if (!data || !data.rates) throw new Error("無效匯率資料");

    exchangeRates = {
      USD: 1,
      TWD: data.rates.TWD || 30,
      JPY: data.rates.JPY || 150,
      EUR: data.rates.EUR || 0.9,
    };

    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
    if (status) status.textContent = "✅ 匯率更新完成";
  } catch (e) {
    console.warn("⚠️ 匯率查詢失敗，改用本地資料", e.message);
    const stored = localStorage.getItem("exchangeRates");
    if (stored && stored !== "undefined") {
      exchangeRates = JSON.parse(stored);
      if (status) status.textContent = "⚠️ 使// ===== Part 1：初始化與查詢 =====

// ✅ 語系用函式 function i18n(key) { const lang = localStorage.getItem("lang") || "zh-Hant"; return translations?.[lang]?.[key] || key; }

// ✅ 帳本選擇與 LocalStorage Key 取得 function getSelectedAccount() { return localStorage.getItem("selectedAccount") || "default"; } function getLocalStorageKey() { return assets_${getSelectedAccount()}; }

// ✅ 初始化變數 let assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]"); let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]"); let exchangeRates = {}; let editIndex = null;

// ✅ DOM 元素定義 let form, typeSelect, stockFields, insuranceFields, amountField; let assetList, totalsList, profitList, bankDatalist;

// ===== 匯率查詢 ===== async function fetchExchangeRates() { const status = document.getElementById("exchange-status"); try { if (status) status.textContent = "📡 " + i18n("fetching_exchange"); const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=TWD,JPY,EUR"); const data = await res.json(); if (!data || !data.rates) throw new Error(i18n("invalid_exchange_data"));

exchangeRates = {
  USD: 1,
  TWD: data.rates.TWD || 30,
  JPY: data.rates.JPY || 150,
  EUR: data.rates.EUR || 0.9,
};

localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
if (status) status.textContent = "✅ " + i18n("exchange_updated");

} catch (e) { console.warn("⚠️ " + i18n("exchange_failed"), e.message); const stored = localStorage.getItem("exchangeRates"); if (stored && stored !== "undefined") { exchangeRates = JSON.parse(stored); if (status) status.textContent = "⚠️ " + i18n("using_stored_exchange"); } else { exchangeRates = { USD: 1, TWD: 30, JPY: 150, EUR: 0.9 }; if (status) status.textContent = "⚠️ " + i18n("using_default_exchange"); } } }

// ===== 股票查價（TwelveData / 台股）===== async function fetchStockPrice(symbol, category) { try { if (category === "台股") { const now = new Date(); const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, "0"); const dd = String(now.getDate()).padStart(2, "0"); const date = ${yyyy}${mm}${dd}; const url = https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${symbol}; const res = await fetch(url); const data = await res.json(); if (data.stat !== "OK" || !data.data?.length) return null; const lastRow = data.data[data.data.length - 1]; const close = parseFloat(lastRow[6].replace(/,/g, "")); return close; } else { const apiKey = "de909496c6754a89bc33db0306c2def8"; // Your TwelveData API key const url = https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apiKey}; const res = await fetch(url); const data = await res.json(); if (data.status === "error" || data.code || !data.price) return null; return parseFloat(data.price); } } catch (e) { console.error("❌ " + i18n("stock_price_error"), e); return null; } }

// ===== 更新所有股票現價 ===== async function updateAllStockPrices() { const updatedAssets = await Promise.all( assets.map(async (item) => { if (item.type === "股票" && item.stockSymbol && item.stockCategory) { const newPrice = await fetchStockPrice(item.stockSymbol, item.stockCategory); if (newPrice !== null) item.price = newPrice; } return item; }) ); assets = updatedAssets; localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets)); if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) { await FINORA_AUTH.saveUserAssets(assets); } }

// ===== DOMContentLoaded 初始化程序 ===== document.addEventListener("DOMContentLoaded", async () => { try { // 綁定表單與畫面元素 form = document.getElementById("asset-form"); typeSelect = document.getElementById("type"); stockFields = document.getElementById("stock-fields"); insuranceFields = document.getElementById("insurance-fields"); amountField = document.getElementById("amount-field"); assetList = document.getElementById("asset-list"); totalsList = document.getElementById("totals-list"); profitList = document.getElementById("stock-profit-list"); bankDatalist = document.getElementById("bank-list");

form.addEventListener("submit", handleSubmit);
typeSelect.addEventListener("change", toggleFields);

bankHistory.forEach((b) => {
  const option = document.createElement("option");
  option.value = b;
  bankDatalist.appendChild(option);
});

const stockSymbolInput = document.getElementById("stock-symbol");
const stockCategorySelect = document.getElementById("stock-category");
const stockPriceInput = document.getElementById("stock-price");
if (stockSymbolInput && stockCategorySelect && stockPriceInput) {
  stockSymbolInput.addEventListener("blur", async () => {
    const symbol = stockSymbolInput.value.trim();
    const category = stockCategorySelect.value;
    if (!symbol || !category) return;
    const price = await fetchStockPrice(symbol, category);
    if (price !== null) {
      stockPriceInput.value = price;
      console.log(`✅ ${symbol} ${i18n("price_updated")}：${price}`);
    } else {
      console.warn(`⚠️ ${i18n("price_fetch_failed")} ${symbol}`);
    }
  });
}

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
      if (price) {
        cryptoPriceInput.value = price;
        console.log(`✅ ${symbol} ${i18n("price_updated")}：${price}`);
      } else {
        console.warn(`⚠️ ${i18n("price_not_found")} ${symbol}`);
      }
    } catch (e) {
      console.error("❌ " + i18n("crypto_price_error"), e);
    }
  });
}

await fetchExchangeRates();
await updateAllStockPrices();
toggleFields();
render();
console.log("✅ " + i18n("init_success"));

} catch (e) { console.error("❌ " + i18n("init_failed"), e); alert(i18n("init_error_alert")); } });

用上次儲存的匯率資料";
    } else {
      exchangeRates = { USD: 1, TWD: 30, JPY: 150, EUR: 0.9 };
      if (status) status.textContent = "⚠️ 使用預設匯率資料";
    }
  }
}

// ===== 股票查價（TwelveData / 台股）=====
async function fetchStockPrice(symbol, category) {
  try {
    if (category === "台股") {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const date = `${yyyy}${mm}${dd}`;
      const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${date}&stockNo=${symbol}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.stat !== "OK" || !data.data?.length) return null;
      const lastRow = data.data[data.data.length - 1];
      const close = parseFloat(lastRow[6].replace(/,/g, ""));
      return close;
    } else {
      const apiKey = "de909496c6754a89bc33db0306c2def8"; // Your TwelveData API key
      const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "error" || data.code || !data.price) return null;
      return parseFloat(data.price);
    }
  } catch (e) {
    console.error("❌ 股票查價錯誤", e);
    return null;
  }
}

// ===== 更新所有股票現價 =====
async function updateAllStockPrices() {
  const updatedAssets = await Promise.all(
    assets.map(async (item) => {
      if (item.type === "股票" && item.stockSymbol && item.stockCategory) {
        const newPrice = await fetchStockPrice(item.stockSymbol, item.stockCategory);
        if (newPrice !== null) item.price = newPrice;
      }
      return item;
    })
  );
  assets = updatedAssets;
  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
  if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
    await FINORA_AUTH.saveUserAssets(assets);
  }
}

// ===== DOMContentLoaded 初始化程序 =====
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 綁定表單與畫面元素
    form = document.getElementById("asset-form");
    typeSelect = document.getElementById("type");
    stockFields = document.getElementById("stock-fields");
    insuranceFields = document.getElementById("insurance-fields");
    amountField = document.getElementById("amount-field");
    assetList = document.getElementById("asset-list");
    totalsList = document.getElementById("totals-list");
    profitList = document.getElementById("stock-profit-list");
    bankDatalist = document.getElementById("bank-list");

    // 表單事件綁定
    form.addEventListener("submit", handleSubmit);
    typeSelect.addEventListener("change", toggleFields);

    // 銀行歷史填入 datalist
    bankHistory.forEach((b) => {
      const option = document.createElement("option");
      option.value = b;
      bankDatalist.appendChild(option);
    });

    // 股票查價
    const stockSymbolInput = document.getElementById("stock-symbol");
    const stockCategorySelect = document.getElementById("stock-category");
    const stockPriceInput = document.getElementById("stock-price");

    if (stockSymbolInput && stockCategorySelect && stockPriceInput) {
      stockSymbolInput.addEventListener("blur", async () => {
        const symbol = stockSymbolInput.value.trim();
        const category = stockCategorySelect.value;
        if (!symbol || !category) return;
        const price = await fetchStockPrice(symbol, category);
        if (price !== null) {
          stockPriceInput.value = price;
          console.log(`✅ ${symbol} 價格更新：${price}`);
        } else {
          console.warn(`⚠️ 查詢 ${symbol} 價格失敗`);
        }
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
          if (price) {
            cryptoPriceInput.value = price;
            console.log(`✅ ${symbol} 價格更新：${price}`);
          } else {
            console.warn(`⚠️ 查無 ${symbol} 價格`);
          }
        } catch (e) {
          console.error("❌ 加密貨幣查價錯誤", e);
        }
      });
    }

    // 初始化流程執行
    await fetchExchangeRates();
    await updateAllStockPrices();
    toggleFields();
    render();
    console.log("✅ 初始化完成");
  } catch (e) {
    console.error("❌ 初始化失敗", e);
    alert("系統初始化錯誤，請重新整理頁面");
  }
});

// ===== Part 2：表單處理與存儲 =====

// 切換欄位顯示 function toggleFields() { const type = document.getElementById("type").value; document.getElementById("stock-fields").style.display = type === "股票" ? "block" : "none"; document.getElementById("insurance-fields").style.display = type === "儲蓄保險" ? "block" : "none"; document.getElementById("fund-fields").style.display = type === "基金" ? "block" : "none"; document.getElementById("crypto-fields").style.display = type === "加密貨幣" ? "block" : "none"; document.getElementById("amount-field").style.display = ["定存", "現金", "房產", "其他"].includes(type) ? "block" : "none"; }

// 儲存資產表單 async function handleSubmit(e) { e.preventDefault();

const type = document.getElementById("type").value; const currency = document.getElementById("currency").value; const bank = document.getElementById("bank").value; const note = document.getElementById("note").value;

const asset = { type, currency, bank, note };

if (type === "股票") { asset.stockSymbol = document.getElementById("stock-symbol").value; asset.stockCategory = document.getElementById("stock-category").value; asset.shares = parseFloat(document.getElementById("stock-shares").value) || 0; asset.cost = parseFloat(document.getElementById("stock-cost").value) || 0; asset.price = parseFloat(document.getElementById("stock-price").value) || 0; } else if (type === "儲蓄保險") { asset.insuranceName = document.getElementById("insurance-name").value; asset.insuranceAmount = parseFloat(document.getElementById("insurance-amount").value) || 0; asset.insuranceYears = parseInt(document.getElementById("insurance-years").value) || 0; asset.insurancePayment = parseFloat(document.getElementById("insurance-payment").value) || 0; } else if (type === "基金") { asset.fundName = document.getElementById("fund-name").value; asset.fundUnits = parseFloat(document.getElementById("fund-units").value) || 0; asset.fundNav = parseFloat(document.getElementById("fund-nav").value) || 0; } else if (type === "加密貨幣") { asset.cryptoSymbol = document.getElementById("crypto-symbol").value; asset.cryptoAmount = parseFloat(document.getElementById("crypto-amount").value) || 0; asset.cryptoPrice = parseFloat(document.getElementById("crypto-price").value) || 0; } else { asset.amount = parseFloat(document.getElementById("amount").value) || 0; }

if (bank && !bankHistory.includes(bank)) { bankHistory.push(bank); localStorage.setItem("banks", JSON.stringify(bankHistory)); }

if (editIndex !== null) { assets[editIndex] = asset; editIndex = null; } else { assets.push(asset); }

localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));

// ✅ 雲端同步（等待儲存完成再 render） if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) { await FINORA_AUTH.saveUserAssets(assets); }

form.reset(); toggleFields(); render(); }

// 編輯資產 function handleEdit(index) { document.getElementById("asset-form").scrollIntoView({ behavior: "smooth" }); const item = assets[index]; editIndex = index;

document.getElementById("type").value = item.type; toggleFields(); document.getElementById("currency").value = item.currency || ""; document.getElementById("bank").value = item.bank || ""; document.getElementById("note").value = item.note || "";

if (item.type === "股票") { document.getElementById("stock-symbol").value = item.stockSymbol || ""; document.getElementById("stock-category").value = item.stockCategory || ""; document.getElementById("stock-shares").value = item.shares || ""; document.getElementById("stock-cost").value = item.cost || ""; document.getElementById("stock-price").value = item.price || ""; } else if (item.type === "儲蓄保險") { document.getElementById("insurance-name").value = item.insuranceName || ""; document.getElementById("insurance-amount").value = item.insuranceAmount || ""; document.getElementById("insurance-years").value = item.insuranceYears || ""; document.getElementById("insurance-payment").value = item.insurancePayment || ""; } else if (item.type === "基金") { document.getElementById("fund-name").value = item.fundName || ""; document.getElementById("fund-units").value = item.fundUnits || ""; document.getElementById("fund-nav").value = item.fundNav || ""; } else if (item.type === "加密貨幣") { document.getElementById("crypto-symbol").value = item.cryptoSymbol || ""; document.getElementById("crypto-amount").value = item.cryptoAmount || ""; document.getElementById("crypto-price").value = item.cryptoPrice || ""; } else { document.getElementById("amount").value = item.amount || ""; } }

// 刪除資產 function handleDelete(index) { const confirmText = translations[localStorage.lang || "zh-Hant"].confirm_delete || "確定要刪除這筆資產嗎？"; if (!confirm(confirmText)) return; assets.splice(index, 1); localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets)); if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) { FINORA_AUTH.saveUserAssets(assets); } render(); }

// ===== Part 3：畫面渲染與計算 =====
function render() {
  assetList.innerHTML = "";
  totalsList.innerHTML = "";
  profitList.innerHTML = "";

  const lang = localStorage.getItem("lang") || "zh-Hant";

  const totalsByType = {};
  const totalsByCurrency = {};
  let totalTWD = 0;

  assets.forEach((asset, index) => {
    const li = document.createElement("li");
    const type = asset.type;
    const currency = asset.currency || "TWD";
    const amount = parseFloat(asset.amount || 0);
    let marketValue = amount;
    let profit = 0;

    if (type === "股票") {
      const shares = parseFloat(asset.shares || 0);
      const cost = parseFloat(asset.cost || 0);
      const price = parseFloat(asset.price || 0);
      marketValue = shares * price;
      const totalCost = shares * cost;
      profit = marketValue - totalCost;
      li.textContent = `📈 ${type}（${asset.symbol}）｜股數：${shares}｜成本：${cost}｜現價：${price}｜${translations[lang].amount || '金額'}：${marketValue.toFixed(2)} ${currency}（${translations[lang].profit || '盈餘'}：${profit.toFixed(2)}）`;
    } else if (type === "儲蓄保險") {
      li.textContent = `🛡️ ${type}｜${translations[lang].amount || '金額'}：${amount.toFixed(2)} ${currency}`;
    } else if (type === "基金") {
      li.textContent = `📊 ${type}（${asset.fundName}）｜單位數：${asset.units}｜淨值：${asset.nav}｜${translations[lang].amount || '金額'}：${amount.toFixed(2)} ${currency}`;
    } else if (type === "加密貨幣") {
      li.textContent = `₿ ${type}（${asset.cryptoSymbol}）｜數量：${asset.cryptoAmount}｜現價：${asset.cryptoPrice}｜${translations[lang].amount || '金額'}：${amount.toFixed(2)} ${currency}`;
    } else {
      li.textContent = `📁 ${type}｜${translations[lang].amount || '金額'}：${amount.toFixed(2)} ${currency}`;
    }

    // ➕ 編輯與刪除按鈕
    const editBtn = document.createElement("button");
    editBtn.textContent = translations[lang].edit_btn || "編輯";
    editBtn.addEventListener("click", () => editAsset(index));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = translations[lang].delete_btn || "刪除";
    deleteBtn.addEventListener("click", () => deleteAsset(index));

    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    assetList.appendChild(li);

    // ➕ 類別加總
    if (!totalsByType[type]) totalsByType[type] = {};
    if (!totalsByType[type][currency]) totalsByType[type][currency] = 0;
    totalsByType[type][currency] += marketValue;

    // ➕ 幣別加總
    if (!totalsByCurrency[currency]) totalsByCurrency[currency] = 0;
    totalsByCurrency[currency] += marketValue;

    // ➕ 台幣折算
    const rate = exchangeRates[currency] || 1;
    totalTWD += marketValue * rate;
  });

  // 顯示類別加總
  for (const type in totalsByType) {
    for (const currency in totalsByType[type]) {
      const total = totalsByType[type][currency].toFixed(2);
      const li = document.createElement("li");
      li.textContent = `📌 ${type}：${total} ${currency}`;
      totalsList.appendChild(li);
    }
  }

  // 顯示幣別加總
  for (const currency in totalsByCurrency) {
    const total = totalsByCurrency[currency];
    const li = document.createElement("li");
    const rate = exchangeRates[currency] || 1;
    const converted = (total * rate).toFixed(0);
    li.textContent = `💱 ${currency}：${total.toFixed(2)} ≈ NT$ ${converted}`;
    totalsList.appendChild(li);
  }

  // 顯示折合台幣總資產
  const totalLi = document.createElement("li");
  totalLi.textContent = `💰 ${translations[lang].total_asset || '總資產（折合台幣）'}：NT$ ${totalTWD.toLocaleString()}`;
  totalsList.appendChild(totalLi);

  // 匯率更新時間
  const now = new Date();
  document.getElementById("rate-time").textContent = `${translations[lang].exchange_rate_updated || '匯率更新時間'}：${now.toLocaleTimeString()}`;
}

// ===== Part 4：啟動函式與其他 =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔄 系統初始化中...");

  const lang = localStorage.getItem("lang") || "zh-Hant";

  FINORA_AUTH.onUserChanged(async (user) => {
    const emailEl = document.getElementById("auth-email");
    const accountEl = document.getElementById("account-name");
    const MAX_ACCOUNT_COUNT = 3;

    if (!user) {
      if (emailEl) emailEl.textContent = translations[lang].not_logged_in || "（尚未登入）";
      if (accountEl) accountEl.textContent = translations[lang].no_account_selected || "（尚未選擇）";
      alert(translations[lang].please_login_first || "⚠️ 尚未登入，請先登入 Google 帳號");
      return;
    }

    try {
      // ===== 元素綁定 =====
      form = document.getElementById("asset-form");
      typeSelect = document.getElementById("type");
      stockFields = document.getElementById("stock-fields");
      insuranceFields = document.getElementById("insurance-fields");
      amountField = document.getElementById("amount-field");
      assetList = document.getElementById("asset-list");
      totalsList = document.getElementById("totals-list");
      profitList = document.getElementById("stock-profit-list");
      bankDatalist = document.getElementById("bank-list");

      // ===== 顯示帳戶資訊 =====
      const accountId = getSelectedAccount();
      const list = await FINORA_AUTH.fetchAccountList();
      const displayName = list.find(acc => acc.id === accountId)?.displayName || accountId;
      if (emailEl) emailEl.textContent = user.email;
      if (accountEl) accountEl.textContent = `${displayName}（${list.length} / ${MAX_ACCOUNT_COUNT}）`;

      // ===== 表單監聽 =====
      form.addEventListener("submit", handleSubmit);
      typeSelect.addEventListener("change", toggleFields);

      // ===== 銀行記憶選單 =====
      bankHistory.forEach((b) => {
        const option = document.createElement("option");
        option.value = b;
        bankDatalist.appendChild(option);
      });

      // ===== 股票查價綁定 =====
      const stockSymbolInput = document.getElementById("stock-symbol");
      const stockCategorySelect = document.getElementById("stock-category");
      const stockPriceInput = document.getElementById("stock-price");
      if (stockSymbolInput && stockCategorySelect && stockPriceInput) {
        stockSymbolInput.addEventListener("blur", async () => {
          const symbol = stockSymbolInput.value.trim();
          const category = stockCategorySelect.value;
          if (!symbol || !category) return;
          const price = await fetchStockPrice(symbol, category);
          if (price !== null) stockPriceInput.value = price;
        });
      }

      // ===== 加密貨幣查價綁定 =====
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
            console.error("❌ 查詢加密貨幣價格錯誤", e);
          }
        });
      }

      // ===== 初始化流程 =====
      await fetchExchangeRates();
      await updateAllStockPrices();
      assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");
      toggleFields();
      render();
      applyLang();  // ✅ 多語系套用
      console.log("✅ 初始化完成");

    } catch (e) {
      console.error("❌ 初始化失敗", e);
      alert(translations[lang].init_error || "系統初始化錯誤，請重新整理頁面");
    }
  });
});
