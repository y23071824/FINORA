// ===== Part 1：初始化與查詢 =====

// 取得目前帳本的 key
function getSelectedAccount() {
  return localStorage.getItem("selectedAccount") || "default";
}
function getLocalStorageKey() {
  return `assets_${getSelectedAccount()}`;
}

// 初始化資料變數
let assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");
let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");
let exchangeRates = {};
let editIndex = null;

// DOM 元素先用 let 宣告（之後 DOMContentLoaded 時再綁定）
let form, typeSelect, stockFields, insuranceFields, amountField;
let assetList, totalsList, profitList, bankDatalist;

// DOMContentLoaded 中再做初始化
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 🔗 元素綁定
    form = document.getElementById("asset-form");
    typeSelect = document.getElementById("type");
    stockFields = document.getElementById("stock-fields");
    insuranceFields = document.getElementById("insurance-fields");
    amountField = document.getElementById("amount-field");
    assetList = document.getElementById("asset-list");
    totalsList = document.getElementById("totals-list");
    profitList = document.getElementById("stock-profit-list");
    bankDatalist = document.getElementById("bank-list");
    
async function fetchExchangeRates() {
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=TWD,JPY,EUR");
    const data = await res.json();
    exchangeRates = data.rates;
    exchangeRates["TWD"] = exchangeRates["TWD"] || 30;
    exchangeRates["JPY"] = exchangeRates["JPY"] || 150;
    exchangeRates["EUR"] = exchangeRates["EUR"] || 0.9;
    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
  } catch (e) {
    console.warn("⚠️ 匯率查詢失敗，改用本地資料");
    exchangeRates = JSON.parse(localStorage.getItem("exchangeRates") || "{}");
  }
}
    // 執行初始化功能
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
      const apiKey = "de909496c6754a89bc33db0306c2def8";
      const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "error" || data.code || !data.price) return null;
      return parseFloat(data.price);
    }
  } catch (e) {
    console.error("查詢股價錯誤", e);
    return null;
  }
}

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
 // ✅ 若有登入帳號就同步到 Firebase
  if (typeof FINORA_AUTH !== "undefined") FINORA_AUTH.saveUserAssets(assets);
}

// ===== Part 2：表單處理與存儲 =====

function handleSubmit(e) {
  e.preventDefault();

  const type = document.getElementById("type").value;
  const currency = document.getElementById("currency").value;
  const bank = document.getElementById("bank").value;
  const note = document.getElementById("note").value;

  const asset = { type, currency, bank, note };

  if (type === "股票") {
    asset.stockSymbol = document.getElementById("stock-symbol").value;
    asset.stockCategory = document.getElementById("stock-category").value;
    asset.shares = parseFloat(document.getElementById("stock-shares").value) || 0;
    asset.cost = parseFloat(document.getElementById("stock-cost").value) || 0;
    asset.price = parseFloat(document.getElementById("stock-price").value) || 0;
  } else if (type === "儲蓄保險") {
    asset.insuranceName = document.getElementById("insurance-name").value;
    asset.insuranceAmount = parseFloat(document.getElementById("insurance-amount").value) || 0;
    asset.insuranceYears = parseInt(document.getElementById("insurance-years").value) || 0;
    asset.insurancePayment = parseFloat(document.getElementById("insurance-payment").value) || 0;
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

  if (bank && !bankHistory.includes(bank)) {
    bankHistory.push(bank);
    localStorage.setItem("banks", JSON.stringify(bankHistory));
  }

  if (editIndex !== null) {
    assets[editIndex] = asset;
    editIndex = null;
  } else {
    assets.push(asset);
  }

  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
  if (typeof FINORA_AUTH !== "undefined") FINORA_AUTH.saveUserAssets(assets);

  form.reset();
  toggleFields();
  render();
}

function handleEdit(index) {
  const item = assets[index];
  editIndex = index;

  document.getElementById("type").value = item.type;
  toggleFields();

  document.getElementById("currency").value = item.currency || "";
  document.getElementById("bank").value = item.bank || "";
  document.getElementById("note").value = item.note || "";

  if (item.type === "股票") {
    document.getElementById("stock-symbol").value = item.stockSymbol || "";
    document.getElementById("stock-category").value = item.stockCategory || "";
    document.getElementById("stock-shares").value = item.shares || "";
    document.getElementById("stock-cost").value = item.cost || "";
    document.getElementById("stock-price").value = item.price || "";
  } else if (item.type === "儲蓄保險") {
    document.getElementById("insurance-name").value = item.insuranceName || "";
    document.getElementById("insurance-amount").value = item.insuranceAmount || "";
    document.getElementById("insurance-years").value = item.insuranceYears || "";
    document.getElementById("insurance-payment").value = item.insurancePayment || "";
  } else if (item.type === "基金") {
    document.getElementById("fund-name").value = item.fundName || "";
    document.getElementById("fund-units").value = item.fundUnits || "";
    document.getElementById("fund-nav").value = item.fundNav || "";
  } else if (item.type === "加密貨幣") {
    document.getElementById("crypto-symbol").value = item.cryptoSymbol || "";
    document.getElementById("crypto-amount").value = item.cryptoAmount || "";
    document.getElementById("crypto-price").value = item.cryptoPrice || "";
  } else {
    document.getElementById("amount").value = item.amount || "";
  }
}

function handleDelete(index) {
  if (!confirm("確定要刪除這筆資產嗎？")) return;
  assets.splice(index, 1);
  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
  if (typeof FINORA_AUTH !== "undefined") FINORA_AUTH.saveUserAssets(assets);
  render();
}

// ===== Part 3 + Part 4：畫面渲染與啟動事件 =====

function toggleFields() {
  const type = document.getElementById("type").value;
  document.getElementById("stock-fields").style.display = type === "股票" ? "block" : "none";
  document.getElementById("insurance-fields").style.display = type === "儲蓄保險" ? "block" : "none";
  document.getElementById("fund-fields").style.display = type === "基金" ? "block" : "none";
  document.getElementById("crypto-fields").style.display = type === "加密貨幣" ? "block" : "none";
  document.getElementById("amount-field").style.display = ["定存", "現金", "房產", "其他"].includes(type) ? "block" : "none";
}

function render() {
  assetList.innerHTML = "";
  totalsList.innerHTML = "";
  profitList.innerHTML = "";
  const totals = {};
  const profits = {};
  let totalTWD = 0;

  assets.forEach((item, i) => {
    const li = document.createElement("li");
    li.textContent = `${item.type}：${item.note || "(無備註)"}`;
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.onclick = () => handleEdit(i);
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.onclick = () => handleDelete(i);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    assetList.appendChild(li);

    let value = 0;
    if (item.type === "股票") value = item.shares * item.price;
    else if (item.type === "儲蓄保險") value = item.insuranceAmount;
    else if (item.type === "基金") value = item.fundUnits * item.fundNav;
    else if (item.type === "加密貨幣") value = item.cryptoAmount * item.cryptoPrice;
    else value = item.amount || 0;

    const currency = item.currency || "TWD";
    if (!totals[currency]) totals[currency] = 0;
    totals[currency] += value;
    if (item.type === "股票") {
      const cost = item.shares * item.cost;
      const profit = value - cost;
      if (!profits[currency]) profits[currency] = 0;
      profits[currency] += profit;
    }
  });

  Object.entries(totals).forEach(([cur, amt]) => {
    const rate = exchangeRates[cur] || 1;
    const converted = amt * rate;
    totalTWD += converted;
    const li = document.createElement("li");
    li.textContent = `${cur}：${amt.toFixed(2)}（約 ${converted.toFixed(0)} TWD）`;
    totalsList.appendChild(li);
  });

  Object.entries(profits).forEach(([cur, amt]) => {
    const li = document.createElement("li");
    li.textContent = `股票盈餘 ${cur}：${amt.toFixed(2)}`;
    profitList.appendChild(li);
  });

const totalLi = document.createElement("li");
const formatter = new Intl.NumberFormat('zh-Hant', { style: 'currency', currency: 'TWD' });
totalLi.textContent = `總資產（折合台幣）：${formatter.format(totalTWD)}`;
totalsList.appendChild(totalLi);
}

form.addEventListener("submit", handleSubmit);
typeSelect.addEventListener("change", toggleFields);
bankHistory.forEach((b) => {
  const option = document.createElement("option");
  option.value = b;
  bankDatalist.appendChild(option);
});
