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
    const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=TWD,JPY,EUR");
    const data = await res.json();
    if (!data || !data.rates) throw new Error("無效匯率資料");
    exchangeRates = data.rates;
    exchangeRates["USD"] = 1;
    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
  } catch (e) {
    console.warn("⚠️ 匯率查詢失敗，改用本地資料");
    const saved = localStorage.getItem("exchangeRates");
    if (saved) exchangeRates = JSON.parse(saved);
  }
}

// ✅ 更新所有股票現價（支援美股與台股）
async function updateAllStockPrices() {
  const updatedAssets = [];
  for (let asset of assets) {
    if (asset.type === "股票" && asset.symbol && asset.category) {
      const price = await fetchStockPrice(asset.symbol, asset.category);
      if (price !== null) asset.price = price;
    }
    updatedAssets.push(asset);
  }
  assets = updatedAssets;
  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
  await FINORA_AUTH.saveUserAssets(assets);
}

// ✅ 股票查價（Twelve Data or Yahoo Finance）
async function fetchStockPrice(symbol, category) {
  try {
    if (category === "美股") {
      const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=你的API金鑰`);
      const data = await res.json();
      return parseFloat(data.price);
    } else if (category === "台股") {
      const res = await fetch(`https://tw.stock.yahoo.com/q/q?s=${symbol}`);
      const text = await res.text();
      const match = text.match(/<b>\d+\.\d+<\/b>/);
      if (match) return parseFloat(match[0].replace(/<[^>]+>/g, ""));
    }
  } catch (e) {
    console.warn("❌ 股票查詢失敗", e);
  }
  return null;
}

// ===== Part 2：表單處理與存儲 =====

// ✅ 切換表單欄位
function toggleFields() {
  const type = typeSelect?.value;
  if (!typeSelect || !stockFields || !insuranceFields) return;
  stockFields.style.display = type === "股票" ? "block" : "none";
  insuranceFields.style.display = type === "儲蓄保險" ? "block" : "none";
  document.getElementById("fund-fields").style.display = type === "基金" ? "block" : "none";
  document.getElementById("crypto-fields").style.display = type === "加密貨幣" ? "block" : "none";
  amountField.style.display = ["定存", "現金", "房產", "其他"].includes(type) ? "block" : "none";
}

// ✅ 儲存資產
function handleSubmit(e) {
  e.preventDefault();
  const type = typeSelect.value;
  const currency = document.getElementById("currency").value || "TWD";
  let newAsset = { type, currency };

  try {
    if (type === "股票") {
      newAsset = {
        ...newAsset,
        category: document.getElementById("stock-category").value,
        symbol: document.getElementById("stock-symbol").value.trim(),
        shares: parseFloat(document.getElementById("stock-shares").value),
        cost: parseFloat(document.getElementById("stock-cost").value),
        price: parseFloat(document.getElementById("stock-price").value),
        stockSymbol: document.getElementById("stock-symbol").value.trim(),
      };
    } else if (type === "儲蓄保險") {
      newAsset = {
        ...newAsset,
        insuranceName: document.getElementById("insurance-name").value,
        insuranceAmount: parseFloat(document.getElementById("insurance-amount").value),
        insuranceYears: parseInt(document.getElementById("insurance-years").value),
        insuranceAnnual: parseFloat(document.getElementById("insurance-annual").value),
      };
    } else if (type === "基金") {
      newAsset = {
        ...newAsset,
        fundName: document.getElementById("fund-name").value,
        fundUnits: parseFloat(document.getElementById("fund-units").value),
        fundNav: parseFloat(document.getElementById("fund-nav").value),
      };
    } else if (type === "加密貨幣") {
      newAsset = {
        ...newAsset,
        cryptoSymbol: document.getElementById("crypto-symbol").value.toLowerCase(),
        cryptoAmount: parseFloat(document.getElementById("crypto-amount").value),
        cryptoPrice: parseFloat(document.getElementById("crypto-price").value),
      };
    } else {
      newAsset.amount = parseFloat(document.getElementById("amount").value);
    }

    newAsset.bank = document.getElementById("bank").value || "";
    newAsset.note = document.getElementById("note").value || "";

    if (editIndex !== null) {
      assets[editIndex] = newAsset;
      editIndex = null;
    } else {
      assets.push(newAsset);
    }

    const bankName = newAsset.bank;
    if (bankName && !bankHistory.includes(bankName)) {
      bankHistory.push(bankName);
      localStorage.setItem("banks", JSON.stringify(bankHistory));
    }

    localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
    FINORA_AUTH.saveUserAssets(assets);
    form.reset();
    toggleFields();
    render();
  } catch (e) {
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

  assets.forEach((asset, index) => {
    const li = document.createElement("li");
    li.className = "asset-item";

    let text = `📌 ${asset.type}`;
    let value = 0;
    let cost = 0;
    let display = "";

    if (asset.type === "股票") {
      const { symbol, shares, cost: c, price = 0, currency } = asset;
      const market = shares * price;
      const totalCost = shares * c;
      const profit = market - totalCost;
      value = market;
      cost = totalCost;
      display = `${symbol} × ${shares}｜成本 ${totalCost.toFixed(2)}｜現價 ${price}｜市值 ${market.toFixed(2)}｜盈餘 ${profit.toFixed(2)}`;
    } else if (asset.type === "儲蓄保險") {
      const { insuranceName, insuranceAmount, insuranceYears, insuranceAnnual } = asset;
      value = insuranceAmount;
      display = `${insuranceName}｜保額 ${insuranceAmount}｜年期 ${insuranceYears}｜年繳 ${insuranceAnnual}`;
    } else if (asset.type === "基金") {
      const { fundName, fundUnits, fundNav } = asset;
      value = fundUnits * fundNav;
      display = `${fundName} × ${fundUnits}｜淨值 ${fundNav}｜市值 ${value.toFixed(2)}`;
    } else if (asset.type === "加密貨幣") {
      const { cryptoSymbol, cryptoAmount, cryptoPrice = 0 } = asset;
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

    // 累加分類與幣別
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

  // 類別加總
  for (const type in totalsByType) {
    for (const currency in totalsByType[type]) {
      const total = totalsByType[type][currency].toFixed(2);
      const li = document.createElement("li");
      li.textContent = `📌 ${type}：${total} ${currency}`;
      totalsList.appendChild(li);
    }
  }

  // 幣別加總
  for (const currency in totalsByCurrency) {
    const total = totalsByCurrency[currency];
    const li = document.createElement("li");
    const rate = exchangeRates[currency] || 1;
    const converted = (total * rate).toFixed(0);
    li.textContent = `💱 ${currency}：${total.toFixed(2)} ≈ NT$ ${converted}`;
    totalsList.appendChild(li);
  }

  // 折合台幣總資產
  const totalLi = document.createElement("li");
  totalLi.textContent = `💰 ${i18n("total_asset")}：NT$ ${totalTWD.toLocaleString()}`;
  totalsList.appendChild(totalLi);

  // 匯率更新時間
  const now = new Date();
  document.getElementById("rate-time").textContent = `${i18n("exchange_rate_updated")}：${now.toLocaleTimeString()}`;
}

// 編輯 / 刪除
function editAsset(index) {
  const asset = assets[index];
  editIndex = index;
  typeSelect.value = asset.type;
  toggleFields();

  setTimeout(() => {
    if (asset.type === "股票") {
      document.getElementById("stock-symbol").value = asset.symbol;
      document.getElementById("stock-category").value = asset.category;
      document.getElementById("stock-shares").value = asset.shares;
      document.getElementById("stock-cost").value = asset.cost;
      document.getElementById("stock-price").value = asset.price;
    } else if (asset.type === "儲蓄保險") {
      document.getElementById("insurance-name").value = asset.insuranceName;
      document.getElementById("insurance-amount").value = asset.insuranceAmount;
      document.getElementById("insurance-years").value = asset.insuranceYears;
      document.getElementById("insurance-annual").value = asset.insuranceAnnual;
    } else if (asset.type === "基金") {
      document.getElementById("fund-name").value = asset.fundName;
      document.getElementById("fund-units").value = asset.fundUnits;
      document.getElementById("fund-nav").value = asset.fundNav;
    } else if (asset.type === "加密貨幣") {
      document.getElementById("crypto-symbol").value = asset.cryptoSymbol;
      document.getElementById("crypto-amount").value = asset.cryptoAmount;
      document.getElementById("crypto-price").value = asset.cryptoPrice;
    } else {
      document.getElementById("amount").value = asset.amount;
    }

    document.getElementById("currency").value = asset.currency;
    document.getElementById("bank").value = asset.bank;
    document.getElementById("note").value = asset.note;
  }, 100);
}

function deleteAsset(index) {
  if (!confirm(i18n("delete_confirm") || "確定刪除這筆資產嗎？")) return;
  assets.splice(index, 1);
  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
  FINORA_AUTH.saveUserAssets(assets);
  render();
}

// ===== Part 4：啟動函式與登入綁定 =====
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

      // 帳戶資訊
      const accountId = getSelectedAccount();
      const list = await FINORA_AUTH.fetchAccountList();
      const displayName = list.find(acc => acc.id === accountId)?.displayName || accountId;
      if (emailEl) emailEl.textContent = user.email;
      if (accountEl) accountEl.textContent = `${displayName}（${list.length} / ${MAX_ACCOUNT_COUNT}）`;

      form.addEventListener("submit", handleSubmit);
      typeSelect.addEventListener("change", toggleFields);

      bankHistory.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        bankDatalist.appendChild(opt);
      });

      document.getElementById("stock-symbol")?.addEventListener("blur", async () => {
        const symbol = document.getElementById("stock-symbol").value.trim();
        const category = document.getElementById("stock-category").value;
        if (symbol && category) {
          const price = await fetchStockPrice(symbol, category);
          if (price !== null) document.getElementById("stock-price").value = price;
        }
      });

      document.getElementById("crypto-symbol")?.addEventListener("blur", async () => {
        const symbol = document.getElementById("crypto-symbol").value.trim().toLowerCase();
        if (symbol) {
          try {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`);
            const data = await res.json();
            const price = data[symbol]?.usd;
            if (price) document.getElementById("crypto-price").value = price;
          } catch (e) {
            console.error("❌ 查詢加密貨幣價格錯誤", e);
          }
        }
      });

      // 初始化流程
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





