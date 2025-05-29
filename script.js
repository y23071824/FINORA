// ===== Finora 資產登記 App =====
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // === Part 1 ===
    // 初始化元素與變數（不需再次包一層）
    const form = document.getElementById("asset-form");
    const typeSelect = document.getElementById("type");
    const stockFields = document.getElementById("stock-fields");
    const insuranceFields = document.getElementById("insurance-fields");
    const amountField = document.getElementById("amount-field");
    const assetList = document.getElementById("asset-list");
    const totalsList = document.getElementById("totals-list");
    const profitList = document.getElementById("stock-profit-list");
    const bankDatalist = document.getElementById("bank-list");

    // ✅ 匯率與股價初始化
    await fetchExchangeRates();
    console.log("✅ 匯率查詢完成");

    await updateAllStockPrices();
    console.log("✅ 股票現價更新完成");

    // ✅ 初始化表單與畫面
    toggleFields();
    render();
    console.log("✅ 初始化完成");
  } catch (e) {
    console.error("❌ 初始化失敗", e);
    alert("系統初始化錯誤，請重新整理頁面");
  }
});
  // ✅ 帳本相關函式
  function getSelectedAccount() {
    return localStorage.getItem("selectedAccount") || "default";
  }

  function getLocalStorageKey() {
    return `assets_${getSelectedAccount()}`;
  }

  // ✅ 初始化本地資料變數（使用帳本 key）
  let assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]"); // 所有資產項目
  let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");         // 銀行記憶清單
  let exchangeRates = {};                                                      // 即時匯率資料
  let editIndex = null;                                                        // 是否處於「編輯模式」

  // ===== 匯率查詢函式 =====
  async function fetchExchangeRates() {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();

      if (!data || !data.rates) throw new Error("API 回傳格式錯誤");

      exchangeRates = {
        USD: 1,
        TWD: data.rates.TWD,
        JPY: data.rates.JPY,
        EUR: data.rates.EUR,
      };

      localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates)); // 儲存備用
    } catch (e) {
      console.warn("⚠️ 匯率 API 失敗，使用預設值", e);
      exchangeRates = {
        USD: 1,
        TWD: 30.21,
        JPY: 151.4,
        EUR: 0.92,
      };

      localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
    }
  }

  // ===== 股票價格查詢函式（支援台股與美股）=====
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

        if (data.stat !== "OK" || !data.data?.length) {
          alert("台股查價失敗，請稍後再試或手動輸入");
          return null;
        }

        const lastRow = data.data[data.data.length - 1];
        const close = parseFloat(lastRow[6].replace(/,/g, ""));
        return close;
      } else {
        const apiKey = "de909496c6754a89bc33db0306c2def8";
        const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === "error" || data.code || !data.price) return null;
        return parseFloat(data.price);
      }
    } catch (e) {
      console.error("查詢股價錯誤", e);
      alert("查詢失敗，請檢查代碼或稍後再試");
      return null;
    }
  }

  // ===== 批次更新所有股票現價 =====
  async function updateAllStockPrices() {
    const updatedAssets = await Promise.all(
      assets.map(async (item) => {
        if (item.type === "股票" && item.stockSymbol && item.stockCategory) {
          const newPrice = await fetchStockPrice(item.stockSymbol, item.stockCategory);
          if (newPrice !== null) {
            item.price = newPrice;
          }
        }
        return item;
      })
    );

    assets = updatedAssets;
    localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets)); // ✅ 使用帳本 key 儲存
  }

  // 🔁 初始化流程中的其他函式（如 render 等）應寫在後續 Part 2～4
});

// ===== Part 2：表單處理與存儲 =====

// ✅ 新增：取得當前帳本儲存用的 key
function getSelectedAccount() {
  return localStorage.getItem("selectedAccount") || "default";
}
function getLocalStorageKey() {
  return `assets_${getSelectedAccount()}`;
}

// 根據選取的資產類型，切換對應的欄位顯示
function toggleFields() {
  const type = document.getElementById("type").value;

  document.getElementById("stock-fields").style.display = type === "股票" ? "block" : "none";
  document.getElementById("insurance-fields").style.display = type === "儲蓄保險" ? "block" : "none";
  document.getElementById("fund-fields").style.display = type === "基金" ? "block" : "none";
  document.getElementById("crypto-fields").style.display = type === "加密貨幣" ? "block" : "none";
  document.getElementById("amount-field").style.display =
    ["現金", "定存", "房產", "其他"].includes(type) ? "block" : "none";
}

// 當使用者切換「資產種類」，觸發欄位顯示切換
typeSelect.addEventListener("change", toggleFields);

// ===== 股票查價（輸入代碼後自動查價格）=====
document.getElementById("stock-symbol")?.addEventListener("blur", async () => {
  const symbol = document.getElementById("stock-symbol").value.trim().toUpperCase();
  const category = document.getElementById("stock-category").value;
  if (!symbol || !category) return;
  const price = await fetchStockPrice(symbol, category);
  if (price !== null) {
    document.getElementById("price").value = price.toFixed(2);
  } else {
    alert("查無此股票代碼或查價失敗");
  }
});

// ===== 加密幣查價（使用 CoinGecko API）=====
async function fetchCryptoPrice(symbol) {
  const idMap = {
    BTC: "bitcoin",
    ETH: "ethereum",
    USDT: "tether",
    BNB: "binancecoin",
    XRP: "ripple",
    DOGE: "dogecoin",
    ADA: "cardano",
    SOL: "solana"
  };

  const id = idMap[symbol.toUpperCase()];
  if (!id) {
    alert("⚠️ 不支援的幣種，請輸入 BTC、ETH、USDT 等主流幣種");
    return null;
  }

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    const data = await res.json();
    return data[id]?.usd || null;
  } catch (e) {
    console.error("❌ 幣價查詢失敗", e);
    return null;
  }
}

document.getElementById("crypto-symbol")?.addEventListener("blur", async () => {
  const symbol = document.getElementById("crypto-symbol").value.trim().toUpperCase();
  if (!symbol) return;
  const price = await fetchCryptoPrice(symbol);
  if (price !== null) {
    document.getElementById("crypto-price").value = price.toFixed(4);
  } else {
    alert("⚠️ 幣價查詢失敗，請稍後再試");
  }
});

// ✅ 使用帳本分開儲存
let assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");

// ===== 表單提交處理（新增或編輯資產）=====
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const type = typeSelect.value;
  if (!type) return alert("⚠️ 請選擇資產種類");

  const asset = {
    type,
    currency: document.getElementById("currency").value,
    bank: document.getElementById("bank").value,
    note: document.getElementById("note").value,
  };

  if (type === "股票") {
    const shares = parseFloat(document.getElementById("shares").value);
    const cost = parseFloat(document.getElementById("cost").value);
    if (isNaN(shares) || isNaN(cost)) return alert("⚠️ 股票類別請填寫股數與成本");
    asset.stockCategory = document.getElementById("stock-category").value;
    asset.stockSymbol = document.getElementById("stock-symbol").value;
    asset.shares = shares;
    asset.cost = cost;
    asset.price = parseFloat(document.getElementById("price").value) || 0;

  } else if (type === "儲蓄保險") {
    asset.policyName = document.getElementById("policy-name").value;
    asset.policyAmount = parseFloat(document.getElementById("policy-amount").value) || 0;
    asset.policyYears = parseInt(document.getElementById("policy-years").value) || 0;
    asset.policyPremium = parseFloat(document.getElementById("policy-premium").value) || 0;

  } else if (type === "基金") {
    asset.fundName = document.getElementById("fund-name").value;
    asset.fundUnits = parseFloat(document.getElementById("fund-units").value) || 0;
    asset.fundNav = parseFloat(document.getElementById("fund-nav").value) || 0;

  } else if (type === "加密貨幣") {
    asset.cryptoSymbol = document.getElementById("crypto-symbol").value;
    asset.cryptoAmount = parseFloat(document.getElementById("crypto-amount").value) || 0;
    asset.cryptoPrice = parseFloat(document.getElementById("crypto-price").value) || 0;

  } else {
    asset.amount = parseFloat(document.getElementById("amount").value) || 0;
  }

  if (editIndex !== null) {
    assets[editIndex] = asset;
    editIndex = null;
  } else {
    assets.push(asset);
  }

  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));

  if (asset.bank && !bankHistory.includes(asset.bank)) {
    bankHistory.push(asset.bank);
    localStorage.setItem("banks", JSON.stringify(bankHistory));
  }

  if (window.FINORA_AUTH && typeof FINORA_AUTH.saveUserAssets === "function") {
    FINORA_AUTH.saveUserAssets(assets)
      .then(() => console.log("✅ 資產已同步至雲端"))
      .catch(e => console.warn("❗ 雲端同步失敗：", e));
  }

  alert("✅ 資產已成功儲存！");
  form.reset();
  toggleFields();
  render();
});

// ===== 編輯現有資產（將資料填入表單）=====
window.editAsset = function (index) {
  const item = assets[index];
  editIndex = index;

  typeSelect.value = item.type;
  document.getElementById("currency").value = item.currency;
  document.getElementById("bank").value = item.bank;
  document.getElementById("note").value = item.note;

  toggleFields();

  if (item.type === "股票") {
    document.getElementById("stock-category").value = item.stockCategory;
    document.getElementById("stock-symbol").value = item.stockSymbol;
    document.getElementById("shares").value = item.shares;
    document.getElementById("cost").value = item.cost;
    document.getElementById("price").value = item.price;

  } else if (item.type === "儲蓄保險") {
    document.getElementById("policy-name").value = item.policyName;
    document.getElementById("policy-amount").value = item.policyAmount;
    document.getElementById("policy-years").value = item.policyYears;
    document.getElementById("policy-premium").value = item.policyPremium;

  } else if (item.type === "基金") {
    document.getElementById("fund-name").value = item.fundName;
    document.getElementById("fund-units").value = item.fundUnits;
    document.getElementById("fund-nav").value = item.fundNav;

  } else if (item.type === "加密貨幣") {
    document.getElementById("crypto-symbol").value = item.cryptoSymbol;
    document.getElementById("crypto-amount").value = item.cryptoAmount;
    document.getElementById("crypto-price").value = item.cryptoPrice;

  } else {
    document.getElementById("amount").value = item.amount;
// ===== Part 2：表單處理與存儲 =====

function getSelectedAccount() { return localStorage.getItem("selectedAccount") || "default"; } function getLocalStorageKey() { return assets_${getSelectedAccount()}; }

function toggleFields() { const type = document.getElementById("type").value;

document.getElementById("stock-fields").style.display = type === "股票" ? "block" : "none"; document.getElementById("insurance-fields").style.display = type === "儲蓄保險" ? "block" : "none"; document.getElementById("fund-fields").style.display = type === "基金" ? "block" : "none"; document.getElementById("crypto-fields").style.display = type === "加密貨幣" ? "block" : "none"; document.getElementById("amount-field").style.display = ["現金", "定存", "房產", "其他"].includes(type) ? "block" : "none"; }

typeSelect.addEventListener("change", toggleFields);

document.getElementById("stock-symbol")?.addEventListener("blur", async () => { const symbol = document.getElementById("stock-symbol").value.trim().toUpperCase(); const category = document.getElementById("stock-category").value; if (!symbol || !category) return; const price = await fetchStockPrice(symbol, category); if (price !== null) { document.getElementById("price").value = price.toFixed(2); } else { alert("查無此股票代碼或查價失敗"); } });

async function fetchCryptoPrice(symbol) { const idMap = { BTC: "bitcoin", ETH: "ethereum", USDT: "tether", BNB: "binancecoin", XRP: "ripple", DOGE: "dogecoin", ADA: "cardano", SOL: "solana" };

const id = idMap[symbol.toUpperCase()]; if (!id) { alert("⚠️ 不支援的幣種，請輸入 BTC、ETH、USDT 等主流幣種"); return null; }

try { const res = await fetch(https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd); const data = await res.json(); return data[id]?.usd || null; } catch (e) { console.error("❌ 幣價查詢失敗", e); return null; } }

document.getElementById("crypto-symbol")?.addEventListener("blur", async () => { const symbol = document.getElementById("crypto-symbol").value.trim().toUpperCase(); if (!symbol) return; const price = await fetchCryptoPrice(symbol); if (price !== null) { document.getElementById("crypto-price").value = price.toFixed(4); } else { alert("⚠️ 幣價查詢失敗，請稍後再試"); } });

let assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");

form.addEventListener("submit", (e) => { e.preventDefault();

const type = typeSelect.value; if (!type) return alert("⚠️ 請選擇資產種類");

const asset = { type, currency: document.getElementById("currency").value, bank: document.getElementById("bank").value.trim(), note: document.getElementById("note").value, };

if (type === "股票") { const shares = parseFloat(document.getElementById("shares").value); const cost = parseFloat(document.getElementById("cost").value); if (isNaN(shares) || isNaN(cost)) return alert("⚠️ 股票類別請填寫股數與成本"); asset.stockCategory = document.getElementById("stock-category").value; asset.stockSymbol = document.getElementById("stock-symbol").value; asset.shares = shares; asset.cost = cost; asset.price = parseFloat(document.getElementById("price").value) || 0;

} else if (type === "儲蓄保險") { asset.policyName = document.getElementById("policy-name").value; asset.policyAmount = parseFloat(document.getElementById("policy-amount").value) || 0; asset.policyYears = parseInt(document.getElementById("policy-years").value) || 0; asset.policyPremium = parseFloat(document.getElementById("policy-premium").value) || 0;

} else if (type === "基金") { asset.fundName = document.getElementById("fund-name").value; asset.fundUnits = parseFloat(document.getElementById("fund-units").value) || 0; asset.fundNav = parseFloat(document.getElementById("fund-nav").value) || 0;

} else if (type === "加密貨幣") { asset.cryptoSymbol = document.getElementById("crypto-symbol").value; asset.cryptoAmount = parseFloat(document.getElementById("crypto-amount").value) || 0; asset.cryptoPrice = parseFloat(document.getElementById("crypto-price").value) || 0;

} else { asset.amount = parseFloat(document.getElementById("amount").value) || 0; }

if (editIndex !== null) { assets[editIndex] = asset; editIndex = null; } else { assets.push(asset); }

localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));

if (asset.bank && !bankHistory.includes(asset.bank.toLowerCase())) { bankHistory.push(asset.bank.toLowerCase()); localStorage.setItem("banks", JSON.stringify(bankHistory)); }

if (window.FINORA_AUTH && typeof FINORA_AUTH.saveUserAssets === "function") { FINORA_AUTH.saveUserAssets(assets) .then(() => console.log("✅ 資產已同步至雲端")) .catch(e => console.warn("❗ 雲端同步失敗：", e)); }

alert("✅ 資產已成功儲存！"); form.reset(); toggleFields(); render(); });

// ===== Part 3：畫面渲染與計算 ===== function render() { try { if (!exchangeRates || Object.keys(exchangeRates).length === 0) { exchangeRates = JSON.parse(localStorage.getItem("exchangeRates") || "{}"); }

assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");

assetList.innerHTML = "";
totalsList.innerHTML = "";
if (profitList) profitList.innerHTML = "";

let categoryTotals = {};
let currencyTotals = {};
let totalTWD = 0;

assets.forEach((item, index) => {
  let display = "", amount = 0, profit = 0;
  const currency = item.currency || "TWD";

  if (item.type === "股票") {
    const shares = parseFloat(item.shares) || 0;
    const cost = parseFloat(item.cost) || 0;
    const price = parseFloat(item.price) || 0;
    const totalCost = shares * cost;
    const value = shares * price;
    profit = value - totalCost;
    amount = isNaN(totalCost) ? 0 : totalCost;

    display = `股票代碼：${item.stockSymbol}｜類型：${item.stockCategory}｜股數：${shares}<br>成本：$${cost}，現價：$${price}<br>總成本：$${totalCost.toFixed(2)}，市值：$${value.toFixed(2)}，盈餘：$${profit.toFixed(2)}`;
  } else if (item.type === "儲蓄保險") {
    amount = parseFloat(item.policyAmount) || 0;
    display = `保單：${item.policyName}<br>保額：$${item.policyAmount}，年期：${item.policyYears}，保費：$${item.policyPremium}`;
  } else if (item.type === "基金") {
    const units = parseFloat(item.fundUnits) || 0;
    const nav = parseFloat(item.fundNav) || 0;
    amount = units * nav;
    display = `基金：${item.fundName}<br>單位數：${units}，淨值：$${nav}<br>總市值：$${amount.toFixed(2)}`;
  } else if (item.type === "加密貨幣") {
    const qty = parseFloat(item.cryptoAmount) || 0;
    const price = parseFloat(item.cryptoPrice) || 0;
    amount = qty * price;
    display = `幣種：${item.cryptoSymbol}<br>數量：${qty}，現價：$${price}<br>總價值：$${amount.toFixed(2)}`;
  } else {
    amount = parseFloat(item.amount) || 0;
    display = `金額：$${amount.toLocaleString()}`;
  }

  const categoryKey = `${item.type}｜${currency}`;
  categoryTotals[categoryKey] = categoryTotals[categoryKey] || { amount: 0, profit: 0, currency };
  categoryTotals[categoryKey].amount += amount;
  if (item.type === "股票") categoryTotals[categoryKey].profit += profit;

  currencyTotals[currency] = currencyTotals[currency] || 0;
  currencyTotals[currency] += amount + (item.type === "股票" ? profit : 0);

  const li = document.createElement("li");
  li.innerHTML = `
    <strong>${item.type}</strong>（${currency}｜${item.bank}）${item.note ? "｜備註：" + item.note : ""}<br>
    ${display}
    <div class="button-group">
      <button onclick="editAsset(${index})">編輯</button>
      <button onclick="deleteAsset(${index})">刪除</button>
    </div>
  `;
  assetList.appendChild(li);
});

for (const key in categoryTotals) {
  const [type, currency] = key.split("｜");
  const item = categoryTotals[key];
  const rate = exchangeRates[currency] || 1;
  const total = item.amount + (item.profit || 0);
  const twd = total * (exchangeRates["TWD"] / rate);
  totalTWD += twd;

  const li = document.createElement("li");
  li.innerHTML = `${type}（${currency}）：$${total.toLocaleString()} ${currency} ≈ NT$ ${twd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  totalsList.appendChild(li);
}

const currencyBreakdown = Object.entries(currencyTotals).map(([ccy, value]) => `$${value.toLocaleString()} ${ccy}`).join("，");
const totalLine = document.createElement("li");
totalLine.style.fontWeight = "bold";
totalLine.textContent = `全體總資產：${currencyBreakdown}，折合台幣：NT$ ${totalTWD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
totalsList.appendChild(totalLine);

const rateTip = document.createElement("li");
rateTip.innerHTML = `📌 1 USD = ${exchangeRates["TWD"]} TWD｜${exchangeRates["JPY"]} JPY｜${exchangeRates["EUR"]} EUR`;
rateTip.style.fontSize = "0.95em";
rateTip.style.color = "#666";
totalsList.appendChild(rateTip);

const reverseRate = document.createElement("li");
const usdRate = (1 / (exchangeRates["TWD"] || 1)).toFixed(3);
const jpyRate = (exchangeRates["JPY"] / exchangeRates["TWD"]).toFixed(2);
const eurRate = (exchangeRates["EUR"] / exchangeRates["TWD"]).toFixed(3);
reverseRate.innerHTML = `📌 1 TWD ≈ ${usdRate} USD｜${jpyRate} JPY｜${eurRate} EUR`;
reverseRate.style.fontSize = "0.95em";
reverseRate.style.color = "#666";
totalsList.appendChild(reverseRate);

const rateTimeEl = document.getElementById("rate-time");
if (rateTimeEl) {
  const updateTime = new Date().toLocaleString();
  rateTimeEl.textContent = `匯率更新時間：${updateTime}`;
}

bankDatalist.innerHTML = "";
bankHistory.forEach(bank => {
  const opt = document.createElement("option");
  opt.value = bank;
  bankDatalist.appendChild(opt);
});

} catch (e) { console.error("❌ render() 錯誤：", e); alert("畫面更新失敗，請檢查資料內容或重新整理"); } }

// ===== Part 4：啟動函式與其他 =====
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await fetchExchangeRates();
    console.log("✅ 匯率查詢完成");

    await updateAllStockPrices();
    console.log("✅ 股票現價更新完成");

    toggleFields();
    render();
    console.log("✅ 初始化完成");
  } catch (e) {
    console.error("❌ 初始化失敗", e);
    alert("系統初始化錯誤，請重新整理頁面");
  }
});
