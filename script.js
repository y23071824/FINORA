// ===== Part 1：初始化與查詢 =====

// ✅ 語系轉換函式
function i18n(key) {
  const lang = localStorage.getItem("lang") || "zh-Hant";
  return translations?.[lang]?.[key] || key;
}

// ✅ 帳本名稱與 localStorage key
function getSelectedAccount() {
  return localStorage.getItem("selectedAccount") || "default";
}
function getLocalStorageKey() {
  return `assets_${getSelectedAccount()}`;
}

// ✅ 初始化資料變數
let assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");
let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");
let exchangeRates = {};
let editIndex = null;

// ✅ DOM 元素定義
let form, typeSelect, stockFields, insuranceFields, fundFields, cryptoFields, amountField;
let assetList, totalsList, profitList, bankDatalist;

// ===== 匯率查詢 =====
async function fetchExchangeRates() {
  const status = document.getElementById("exchange-status");
  try {
    if (status) status.textContent = "📡 " + i18n("fetching_exchange");
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=TWD,JPY,EUR");
    const data = await res.json();
    if (!data || !data.rates) throw new Error(i18n("invalid_exchange_data"));

    exchangeRates = {
      USD: 1,
      TWD: data.rates.TWD || 30,
      JPY: data.rates.JPY || 150,
      EUR: data.rates.EUR || 0.9,
    };

    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
    if (status) status.textContent = "✅ " + i18n("exchange_updated");
  } catch (e) {
    console.warn("⚠️ " + i18n("exchange_failed"), e.message);
    const stored = localStorage.getItem("exchangeRates");
    if (stored && stored !== "undefined") {
      exchangeRates = JSON.parse(stored);
      if (status) status.textContent = "⚠️ " + i18n("using_stored_exchange");
    } else {
      exchangeRates = { USD: 1, TWD: 30, JPY: 150, EUR: 0.9 };
      if (status) status.textContent = "⚠️ " + i18n("using_default_exchange");
    }
  }
}
// ✅ 更新所有股票現價（支援美股與台股）
async function updateAllStockPrices() {
  const updatedAssets = [];
  for (let asset of assets) {
    if (asset.type === "股票" && asset.symbol && asset.category) {
      const price = await fetchStockPrice(asset.symbol, asset.category);
      if (price !== null) {
        asset.price = price;
      }
    }
    updatedAssets.push(asset);
  }
  assets = updatedAssets;
  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
  await FINORA_AUTH.saveUserAssets(assets);
}

// ===== 表單欄位切換 =====
function toggleFields() {
  const type = typeSelect.value;
  stockFields.style.display = type === "股票" ? "block" : "none";
  insuranceFields.style.display = type === "儲蓄保險" ? "block" : "none";
  fundFields.style.display = type === "基金" ? "block" : "none";
  cryptoFields.style.display = type === "加密貨幣" ? "block" : "none";
  amountField.style.display = ["股票", "儲蓄保險", "基金", "加密貨幣"].includes(type) ? "none" : "block";
}

// ===== 表單送出處理 =====
function handleSubmit(e) {
  e.preventDefault();
  const type = document.getElementById("type").value;
  const currency = document.getElementById("currency").value;
  const bank = document.getElementById("bank").value;
  const note = document.getElementById("note").value;

  let newItem = { type, currency, bank, note };

  if (type === "股票") {
    newItem = {
      ...newItem,
      stockCategory: document.getElementById("stock-category").value,
      stockSymbol: document.getElementById("stock-symbol").value.trim(),
      shares: parseFloat(document.getElementById("stock-shares").value) || 0,
      cost: parseFloat(document.getElementById("stock-cost").value) || 0,
      price: parseFloat(document.getElementById("stock-price").value) || 0,
    };
  } else if (type === "儲蓄保險") {
    newItem = {
      ...newItem,
      policyName: document.getElementById("policy-name").value.trim(),
      policyAmount: parseFloat(document.getElementById("policy-amount").value) || 0,
      policyYears: parseInt(document.getElementById("policy-years").value) || 0,
      yearlyPremium: parseFloat(document.getElementById("policy-yearly").value) || 0,
    };
  } else if (type === "基金") {
    newItem = {
      ...newItem,
      fundName: document.getElementById("fund-name").value.trim(),
      fundUnits: parseFloat(document.getElementById("fund-units").value) || 0,
      fundNAV: parseFloat(document.getElementById("fund-nav").value) || 0,
    };
  } else if (type === "加密貨幣") {
    newItem = {
      ...newItem,
      cryptoSymbol: document.getElementById("crypto-symbol").value.trim().toLowerCase(),
      cryptoAmount: parseFloat(document.getElementById("crypto-amount").value) || 0,
      cryptoPrice: parseFloat(document.getElementById("crypto-price").value) || 0,
    };
  } else {
    newItem.amount = parseFloat(document.getElementById("amount").value) || 0;
  }

  if (editIndex !== null) {
    assets[editIndex] = newItem;
    editIndex = null;
  } else {
    assets.push(newItem);
  }

  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
  if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
    FINORA_AUTH.saveUserAssets(assets);
  }

  form.reset();
  toggleFields();
  render();
}



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
    let marketValue = 0;
    let profit = 0;
    let text = "";

    if (type === "股票") {
      const shares = parseFloat(asset.shares || 0);
      const cost = parseFloat(asset.cost || 0);
      const price = parseFloat(asset.price || 0);
      const symbol = asset.stockSymbol || "";
      marketValue = shares * price;
      profit = shares * (price - cost);
      text = `📈 ${type}（${symbol}）｜股數：${shares}｜成本：${cost}｜現價：${price}｜${i18n("amount")}：${marketValue.toFixed(2)} ${currency}（${i18n("profit")}：${profit.toFixed(2)}）`;
    } else if (type === "儲蓄保險") {
      marketValue = parseFloat(asset.insuranceAmount || 0);
      text = `🛡️ ${type}｜${i18n("amount")}：${marketValue.toFixed(2)} ${currency}`;
    } else if (type === "基金") {
      const units = parseFloat(asset.fundUnits || 0);
      const nav = parseFloat(asset.fundNav || 0);
      const name = asset.fundName || "";
      marketValue = units * nav;
      text = `📊 ${type}（${name}）｜單位數：${units}｜淨值：${nav}｜${i18n("amount")}：${marketValue.toFixed(2)} ${currency}`;
    } else if (type === "加密貨幣") {
      const amount = parseFloat(asset.cryptoAmount || 0);
      const price = parseFloat(asset.cryptoPrice || 0);
      const symbol = asset.cryptoSymbol || "";
      marketValue = amount * price;
      text = `₿ ${type}（${symbol}）｜數量：${amount}｜現價：${price}｜${i18n("amount")}：${marketValue.toFixed(2)} ${currency}`;
    } else {
      marketValue = parseFloat(asset.amount || 0);
      text = `📁 ${type}｜${i18n("amount")}：${marketValue.toFixed(2)} ${currency}`;
    }

    li.textContent = text;

    const editBtn = document.createElement("button");
    editBtn.textContent = i18n("edit_btn");
    editBtn.addEventListener("click", () => handleEdit(index));
    li.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = i18n("delete_btn");
    deleteBtn.addEventListener("click", () => handleDelete(index));
    li.appendChild(deleteBtn);

    assetList.appendChild(li);

    if (!totalsByType[type]) totalsByType[type] = {};
    if (!totalsByType[type][currency]) totalsByType[type][currency] = 0;
    totalsByType[type][currency] += marketValue;

    if (!totalsByCurrency[currency]) totalsByCurrency[currency] = 0;
    totalsByCurrency[currency] += marketValue;

    const rate = exchangeRates[currency] || 1;
    totalTWD += marketValue * rate;
  });

  for (const type in totalsByType) {
    for (const currency in totalsByType[type]) {
      const total = totalsByType[type][currency].toFixed(2);
      const li = document.createElement("li");
      li.textContent = `📌 ${type}：${total} ${currency}`;
      totalsList.appendChild(li);
    }
  }

  for (const currency in totalsByCurrency) {
    const total = totalsByCurrency[currency];
    const rate = exchangeRates[currency] || 1;
    const converted = (total * rate).toFixed(0);
    const li = document.createElement("li");
    li.textContent = `💱 ${currency}：${total.toFixed(2)} ≈ NT$ ${converted}`;
    totalsList.appendChild(li);
  }

  const totalLi = document.createElement("li");
  totalLi.textContent = `💰 ${i18n("total_asset")}：NT$ ${totalTWD.toLocaleString()}`;
  totalsList.appendChild(totalLi);

  const now = new Date();
  document.getElementById("rate-time").textContent =
    `${i18n("exchange_rate_updated")}：${now.toLocaleTimeString()}`;
}

// ===== Part 4：啟動函式與登入流程 =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔄 系統初始化中...");
  const lang = localStorage.getItem("lang") || "zh-Hant";

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
      form = document.getElementById("asset-form");
      typeSelect = document.getElementById("type");
      stockFields = document.getElementById("stock-fields");
      insuranceFields = document.getElementById("insurance-fields");
      amountField = document.getElementById("amount-field");
      assetList = document.getElementById("asset-list");
      totalsList = document.getElementById("totals-list");
      profitList = document.getElementById("stock-profit-list");
      bankDatalist = document.getElementById("bank-list");

      const accountId = getSelectedAccount();
      const list = await FINORA_AUTH.fetchAccountList();
      const displayName = list.find(acc => acc.id === accountId)?.displayName || accountId;

      if (emailEl) emailEl.textContent = user.email;
      if (accountEl) accountEl.textContent = `${displayName}（${list.length} / ${MAX_ACCOUNT_COUNT}）`;

      if (form) form.addEventListener("submit", handleSubmit);
      if (typeSelect) typeSelect.addEventListener("change", toggleFields);

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
          if (price !== null) stockPriceInput.value = price;
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
            if (price) cryptoPriceInput.value = price;
          } catch (e) {
            console.error("❌ 加密貨幣查詢失敗", e);
          }
        });
      }

      await fetchExchangeRates();
      await updateAllStockPrices();
      assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");
      toggleFields();
      render();
      applyLang();
      console.log("✅ 初始化完成");

    } catch (e) {
      console.error("❌ 初始化失敗", e);
      alert(i18n("init_error"));
    }
  });
});
