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
}

// ===== Part 2：表單處理與存儲 =====

const form = document.getElementById("asset-form");

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


// ===== Part 3：畫面渲染與計算 =====

function render() {
  assetList.innerHTML = "";
  totalsList.innerHTML = "";
  profitList.innerHTML = "";

  const totals = {};
  const profits = {};

  assets.forEach((item, index) => {
    const li = document.createElement("li");
    let text = "";

    if (item.type === "股票") {
      const costTotal = item.shares * item.cost;
      const valueTotal = item.shares * item.price;
      const profit = valueTotal - costTotal;

      text = `[股票] ${item.stockCategory} ${item.stockSymbol}：${item.shares} 股｜成本 ${item.cost} → 現價 ${item.price}｜市值 ${valueTotal.toFixed(2)}`;
      profits[item.currency] = (profits[item.currency] || 0) + profit;
      totals[item.currency] = (totals[item.currency] || 0) + valueTotal;
    } else if (item.type === "儲蓄保險") {
      text = `[保單] ${item.insuranceName}：保額 ${item.insuranceAmount}，${item.insuranceYears} 年，年繳 ${item.insurancePayment}`;
      totals[item.currency] = (totals[item.currency] || 0) + item.insuranceAmount;
    } else if (item.type === "基金") {
      const value = item.fundUnits * item.fundNav;
      text = `[基金] ${item.fundName}：${item.fundUnits} 單位，淨值 ${item.fundNav}｜市值 ${value.toFixed(2)}`;
      totals[item.currency] = (totals[item.currency] || 0) + value;
    } else if (item.type === "加密貨幣") {
      const value = item.cryptoAmount * item.cryptoPrice;
      text = `[幣] ${item.cryptoSymbol}：${item.cryptoAmount} × ${item.cryptoPrice}｜市值 ${value.toFixed(2)}`;
      totals[item.currency] = (totals[item.currency] || 0) + value;
    } else {
      const amount = item.amount || 0;
      text = `[${item.type}] ${amount} ${item.currency}`;
      totals[item.currency] = (totals[item.currency] || 0) + amount;
    }

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.onclick = () => handleEdit(index);

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.onclick = () => handleDelete(index);

    li.textContent = text;
    li.appendChild(editBtn);
    li.appendChild(delBtn);
    assetList.appendChild(li);
  });

  // 幣別加總與台幣換算
  let totalTWD = 0;
  for (const [currency, amount] of Object.entries(totals)) {
    const rate = exchangeRates[currency] || 1;
    const twdAmount = amount * rate;
    totalTWD += twdAmount;

    const li = document.createElement("li");
    li.textContent = `${currency} 總資產：${amount.toFixed(2)}（約新台幣 ${twdAmount.toLocaleString()} 元）`;
    totalsList.appendChild(li);
  }

  const totalLi = document.createElement("li");
  totalLi.innerHTML = `<strong>💰 全體資產折合新台幣：${totalTWD.toLocaleString()} 元</strong>`;
  totalsList.appendChild(totalLi);

  // 股票盈餘
  for (const [currency, profit] of Object.entries(profits)) {
    const li = document.createElement("li");
    li.textContent = `${currency} 股票盈餘：${profit.toFixed(2)}`;
    profitList.appendChild(li);
  }
}

// ===== Part 4：啟動函式與其他 =====

// 根據資產類型切換欄位顯示
function toggleFields() {
  const type = typeSelect.value;

  stockFields.style.display = type === "股票" ? "block" : "none";
  insuranceFields.style.display = type === "儲蓄保險" ? "block" : "none";
  document.getElementById("fund-fields").style.display = type === "基金" ? "block" : "none";
  document.getElementById("crypto-fields").style.display = type === "加密貨幣" ? "block" : "none";
  amountField.style.display = ["定存", "現金", "房產", "其他"].includes(type) ? "block" : "none";
}

// 綁定表單與選單事件
form.addEventListener("submit", handleSubmit);
typeSelect.addEventListener("change", toggleFields);

// 載入歷史銀行選項
bankHistory.forEach((bank) => {
  const option = document.createElement("option");
  option.value = bank;
  bankDatalist.appendChild(option);
});

// 初始啟動流程
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await fetchExchangeRates();         // 匯率查詢
    console.log("✅ 匯率查詢完成");

    await updateAllStockPrices();       // 股票現價更新
    console.log("✅ 股票現價更新完成");

    toggleFields();                     // 表單欄位初始化
    render();                           // 渲染畫面
    console.log("✅ 初始化完成");
  } catch (e) {
    console.error("❌ 初始化失敗", e);
    alert("系統初始化錯誤，請重新整理頁面");
  }
});
