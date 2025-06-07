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

// ✅ 匯率查詢
async function fetchExchangeRates() {
  try {
    const res = await fetch("https://v6.exchangerate-api.com/v6/747171c8dd2eaa9173e2d890/latest/USD");
    const data = await res.json();

    if (!data || data.result !== "success") throw new Error("匯率查詢失敗");

    exchangeRates = {
      USD: 1,
      TWD: data.conversion_rates.TWD,
      JPY: data.conversion_rates.JPY,
      EUR: data.conversion_rates.EUR
    };

    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
    localStorage.setItem("exchangeRatesTimestamp", Date.now());
    console.log("💱 匯率已更新：", exchangeRates);

    // 更新匯率顯示
    render();
  } catch (err) {
    console.error("❌ 匯率查詢錯誤（ExchangeRate-API）", err);
    alert("⚠️ 無法取得匯率資料，請稍後再試或檢查網路連線");
  }
}

    // ⛑ 嘗試從 localStorage 取出上次成功的資料
    const backup = localStorage.getItem("exchangeRates");
    if (backup) {
      exchangeRates = JSON.parse(backup);
      console.log("📦 使用備援匯率資料（localStorage）", exchangeRates);
    } else {
      // 🚨 最終備援（寫死的安全預設值）
      exchangeRates = {
        "USD": 1,
        "TWD": 32,
        "JPY": 155,
        "EUR": 1.08,
        "CNY": 7.18
      };
      console.log("📦 使用預設匯率資料", exchangeRates);
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
      const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=de909496c6754a89bc33db0306c2def8`);
      const data = await res.json();
      if (data && data.price) return parseFloat(data.price);
    } else if (category === "台股") {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${symbol}&start_date=${today}`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        return data.data[0].close;
      }
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
  if (!Array.isArray(assets)) return;

  if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
    console.warn("❌ 缺少匯率資料，無法 render");
    return;
  }

  if (!exchangeRates["TWD"]) {
    console.warn("❌ TWD 匯率尚未就緒，跳過渲染");
    return;
  }

  assetList.innerHTML = "";
  totalsList.innerHTML = "";
  profitList.innerHTML = "";

  let totalsByType = {};
  let totalsByCurrency = {};
  let totalTWD = 0;

  assets.forEach((asset, index) => {
    const li = document.createElement("li");
    li.className = "asset-item";

let text = `📌 ${i18n("option_" + asset.type) || asset.type}`;
    let value = 0;
    let cost = 0;
    let display = "";

    if (asset.type === "股票") {
      const { stockSymbol = asset.symbol || "?", shares = 0, cost: c = 0, price = 0, currency } = asset;
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
      const { fundName = "", fundUnits = 0, fundNav = 0, currency } = asset;
      value = fundUnits * fundNav;
      display = `${fundName} × ${fundUnits}｜淨值 ${fundNav}｜市值 ${value.toFixed(2)} ${currency}`;
    } else if (asset.type === "加密貨幣") {
      const { cryptoSymbol = "", cryptoAmount = 0, cryptoPrice = 0, currency } = asset;
      value = cryptoAmount * cryptoPrice;
      display = `${cryptoSymbol.toUpperCase()} × ${cryptoAmount}｜現價 ${cryptoPrice}｜市值 ${value.toFixed(2)} ${currency}`;
    } else {
      value = asset.amount || 0;
      display = `${asset.note || ""}｜金額 ${value}`;
    }

    const currency = asset.currency || "TWD";
    const rate = exchangeRates[currency] || 1;
    const converted = value * rate;
    totalTWD += converted;

    // 累加分類與幣別
    totalsByType[asset.type] ??= {};
    totalsByType[asset.type][currency] ??= 0;
    totalsByType[asset.type][currency] += value;

    totalsByCurrency[currency] ??= 0;
    totalsByCurrency[currency] += value;

    // 渲染每筆資產
li.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <div>
      <div><strong>${text}</strong></div>
      <div class="note">${display}</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 0.3rem; align-items: center;">
  <button onclick="editAsset(${index})" class="action-button">✏️</button>
  <button onclick="deleteAsset(${index})" class="action-button">🗑️</button>
</div>
  </div>
`;
    assetList.appendChild(li);
  });

  // 類別加總
  // ➕ 建立盈餘分類容器
const profitByTypeCurrency = {};  // 例：{ 股票: { USD: 123.45, TWD: 543.21 } }

// 先掃過每筆資產，把盈餘分類加總起來
assets.forEach(asset => {
  if (asset.type === "股票") {
    const shares = parseFloat(asset.shares || 0);
    const cost = parseFloat(asset.cost || 0);
    const price = parseFloat(asset.price || 0);
    const currency = asset.currency || "TWD";
    const type = asset.type;

    const profit = (price - cost) * shares;

    if (!profitByTypeCurrency[type]) profitByTypeCurrency[type] = {};
    if (!profitByTypeCurrency[type][currency]) profitByTypeCurrency[type][currency] = 0;
    profitByTypeCurrency[type][currency] += profit;
  }
});

// 🟠 類別加總 + 顯示盈餘
for (const type in totalsByType) {
  for (const currency in totalsByType[type]) {
    const total = totalsByType[type][currency].toFixed(2);
    const li = document.createElement("li");

    // 判斷是否有盈餘可顯示
    const profit = profitByTypeCurrency?.[type]?.[currency] || 0;
    const profitText = profit !== 0 ? `（${i18n("profit")}：${profit.toFixed(2)} ${currency}）` : "";

    li.textContent = `📌 ${i18n("option_" + type)}：${total} ${currency} ${profitText}`;
    if (profit > 0) li.style.color = "green";
    if (profit < 0) li.style.color = "red";
    totalsList.appendChild(li);
  }
}

for (const currency in totalsByCurrency) {
  const total = totalsByCurrency[currency];
  const rateToTWD = exchangeRates[currency] ? (exchangeRates["TWD"] / exchangeRates[currency]) : 1;
  const converted = (total * rateToTWD).toFixed(0);
  const li = document.createElement("li");
  li.textContent = `💱 ${currency}：${total.toFixed(2)} ≈ NT$ ${converted}`;
  totalsList.appendChild(li);
}

  // 最下方總資產換算（使用選擇的幣別）
  const selectedCurrency = localStorage.getItem("displayCurrency") || "TWD";
  const selectedRate = exchangeRates[selectedCurrency];

  if (!selectedRate || isNaN(selectedRate)) {
    console.error(`❌ 無效匯率：${selectedCurrency}`);
    alert(`⚠️ 無法取得 ${selectedCurrency} 的匯率，請稍後再試`);
    return;
  }

  let convertedTotal = 0;
  for (const currency in totalsByCurrency) {
    const value = totalsByCurrency[currency];
    const rate = exchangeRates[currency];
    if (!rate || isNaN(rate)) continue;

    const valueInSelected = (currency === selectedCurrency)
      ? value
      : value * (rate / selectedRate);

    convertedTotal += valueInSelected;
  }

  const convertedLi = document.createElement("li");
  convertedLi.textContent = `💰 ${i18n("total_asset")}（${selectedCurrency}）：${convertedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${selectedCurrency}`;
  totalsList.appendChild(convertedLi);

  // 匯率更新時間
  const now = new Date();
  const rateTime = document.getElementById("rate-time");
  if (rateTime) {
    rateTime.textContent = `${i18n("exchange_rate_updated")}：${now.toLocaleTimeString()}`;
  }
} // ← 補上缺少的 render() 結尾大括號

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

// ===== Part 5：啟動函式與登入綁定 =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔄 系統初始化中...");

  // 顯示幣別選單（總資產計價幣別）
  const displayCurrencySelect = document.getElementById("display-currency");
  if (displayCurrencySelect) {
    const savedDisplayCurrency = localStorage.getItem("displayCurrency") || "TWD";
    displayCurrencySelect.value = savedDisplayCurrency;
    displayCurrencySelect.addEventListener("change", () => {
      localStorage.setItem("displayCurrency", displayCurrencySelect.value);
      render();
    });
  }

  // Firebase 登入狀態監聽
  FINORA_AUTH.onUserChanged(async (user) => {
    const emailEl = document.getElementById("auth-email");
    const accountEl = document.getElementById("account-name");
    const MAX_ACCOUNT_COUNT = 3;

    if (!user) {
      if (emailEl) emailEl.textContent = typeof i18n === "function" ? i18n("not_logged_in") : "尚未登入";
      if (accountEl) accountEl.textContent = typeof i18n === "function" ? i18n("no_account_selected") : "未選帳本";
      alert(typeof i18n === "function" ? i18n("please_login_first") : "請先登入！");
      return;
    }

    try {
      // DOM 元素綁定
      form = document.getElementById("asset-form");
      typeSelect = document.getElementById("type");
      stockFields = document.getElementById("stock-fields");
      insuranceFields = document.getElementById("insurance-fields");
      amountField = document.getElementById("amount-field");
      assetList = document.getElementById("asset-list");
      totalsList = document.getElementById("totals-list");
      profitList = document.getElementById("stock-profit-list");
      bankDatalist = document.getElementById("bank-list");

      // 顯示帳本資訊與 fallback
      const selectedId = localStorage.getItem("selectedAccount");
      const list = await FINORA_AUTH.fetchAccountList();

      console.log("📚 所有帳本清單：", list);
      console.log("📌 localStorage selectedAccount：", selectedId);

      let selected = list.find(acc => acc.id === selectedId);

      if (!selected && list.length > 0) {
        selected = list[0];
        localStorage.setItem("selectedAccount", selected.id);
        console.warn("⚠️ 找不到帳本，已自動切換為第一本帳本：", selected.id);
      } else if (!selected) {
        alert(i18n("no_account_warning") || "⚠️ 找不到任何帳本，請返回首頁建立");
        window.location.href = "../app.html";
        return;
      }

      const displayName = selected.displayName || selected.id;
      if (emailEl) emailEl.textContent = user.email;
      if (accountEl) accountEl.textContent = `${displayName}（${list.length} / ${MAX_ACCOUNT_COUNT}）`;

      // 表單與欄位監聽
      if (form) form.addEventListener("submit", handleSubmit);
      if (typeSelect) typeSelect.addEventListener("change", toggleFields);

      // 銀行選單
      if (bankDatalist) {
        bankDatalist.innerHTML = "";
        bankHistory.forEach(b => {
          const opt = document.createElement("option");
          opt.value = b;
          bankDatalist.appendChild(opt);
        });
      }

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

      // 資料與畫面初始化
      await fetchExchangeRates();
      await updateAllStockPrices();

      console.log("📦 目前使用的 localStorage key：", getLocalStorageKey());
      console.log("📂 對應儲存資料：", localStorage.getItem(getLocalStorageKey()));

      assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");

      if (typeof toggleFields === "function") toggleFields();
      if (typeof render === "function") render();
      if (typeof applyLang === "function") applyLang();

      console.log("✅ 初始化完成");
    } catch (e) {
      console.error("❌ 初始化失敗", e);
      alert(typeof i18n === "function" ? i18n("init_error") : "初始化失敗");
    }
  });
});
