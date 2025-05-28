// ===== Part 1：初始化與匯率、股價查詢 =====

const form = document.getElementById("asset-form");
const typeSelect = document.getElementById("type");
const stockFields = document.getElementById("stock-fields");
const insuranceFields = document.getElementById("insurance-fields");
const fundFields = document.getElementById("fund-fields");
const cryptoFields = document.getElementById("crypto-fields");
const amountField = document.getElementById("amount-field");
const bankDatalist = document.getElementById("bank-list");
const assetList = document.getElementById("asset-list");

let assets = JSON.parse(localStorage.getItem("assets") || "[]");
let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");
let exchangeRates = {};
let editIndex = null;

// 取得匯率資料
async function fetchExchangeRates() {
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=TWD,JPY,EUR");
    const data = await res.json();
    exchangeRates = data.rates;
    exchangeRates["TWD"] = 1; // 補台幣自身參考值
    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
    console.log("✅ 匯率查詢完成");
  } catch (e) {
    console.warn("⚠️ 匯率查詢失敗，改用本地資料");
    exchangeRates = JSON.parse(localStorage.getItem("exchangeRates") || "{}");
  }
}

// 查詢單一股票價格
async function fetchStockPrice(symbol, category) {
  try {
    if (category === "美股") {
      const apikey = "你的 TwelveData API Key";
      const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apikey}`;
      const res = await fetch(url);
      const data = await res.json();
      return parseFloat(data.price);
    } else if (category === "台股") {
      const url = `https://tw.stock.yahoo.com/q/q?s=${symbol}`;
      const res = await fetch(url);
      const text = await res.text();
      const match = text.match(/<b>\d+\.\d+<\/b>/);
      return match ? parseFloat(match[0].replace(/<\/?b>/g, "")) : null;
    }
  } catch (e) {
    console.warn("❌ 股價查詢錯誤", e);
    return null;
  }
}

// 自動更新所有股票現價
async function updateAllStockPrices() {
  for (const item of assets) {
    if (item.type === "股票" && item.stockSymbol && item.stockCategory) {
      const price = await fetchStockPrice(item.stockSymbol, item.stockCategory);
      if (price) item.price = price;
    }
  }
  localStorage.setItem("assets", JSON.stringify(assets));
}

// ===== Part 2：表單處理與存儲 =====

function toggleFields() {
  const type = typeSelect.value;
  stockFields.style.display = type === "股票" ? "block" : "none";
  insuranceFields.style.display = type === "儲蓄保險" ? "block" : "none";
  fundFields.style.display = type === "基金" ? "block" : "none";
  cryptoFields.style.display = type === "加密貨幣" ? "block" : "none";
  amountField.style.display = ["現金", "定存", "房產", "其他"].includes(type) ? "block" : "none";
}

typeSelect.addEventListener("change", toggleFields);

// 股票查價事件
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

// 幣價查詢
async function fetchCryptoPrice(symbol) {
  const idMap = {
    BTC: "bitcoin", ETH: "ethereum", USDT: "tether",
    BNB: "binancecoin", XRP: "ripple", DOGE: "dogecoin",
    ADA: "cardano", SOL: "solana"
  };
  const id = idMap[symbol.toUpperCase()];
  if (!id) return alert("⚠️ 不支援的幣種，請輸入 BTC、ETH 等主流幣");
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

// 表單提交
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
    asset.stockCategory = document.getElementById("stock-category").value;
    asset.stockSymbol = document.getElementById("stock-symbol").value;
    asset.shares = parseFloat(document.getElementById("shares").value);
    asset.cost = parseFloat(document.getElementById("cost").value);
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

  localStorage.setItem("assets", JSON.stringify(assets));
  if (asset.bank && !bankHistory.includes(asset.bank)) {
    bankHistory.push(asset.bank);
    localStorage.setItem("banks", JSON.stringify(bankHistory));
  }

  if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
    FINORA_AUTH.saveUserAssets(assets).then(() => {
      console.log("✅ 雲端儲存成功");
    }).catch((err) => {
      console.warn("⚠️ 雲端儲存失敗", err);
    });
  }

  alert("✅ 資產已成功儲存！");
  form.reset();
  toggleFields();
  render();
});

// 編輯資產
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
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

// 刪除資產
window.deleteAsset = function (index) {
  if (confirm("確定要刪除？")) {
    assets.splice(index, 1);
    localStorage.setItem("assets", JSON.stringify(assets));

    if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
      FINORA_AUTH.saveUserAssets(assets).then(() => {
        console.log("✅ 雲端已同步（刪除後）");
      }).catch((err) => {
        console.warn("⚠️ 雲端同步失敗（刪除後）", err);
      });
    }

    render();
  }
};

// ===== Part 3：畫面渲染與計算 =====

function render() {
  try {
    assetList.innerHTML = "";
    totalsList.innerHTML = "";
    profitList.innerHTML = "";

    const totals = {};
    const profits = {};

    assets.forEach((item, index) => {
      const li = document.createElement("li");

      let value = 0;
      let profit = 0;

      if (item.type === "股票") {
        const marketValue = item.price * item.shares;
        value = marketValue;
        profit = marketValue - item.cost * item.shares;
        profits[item.currency] = (profits[item.currency] || 0) + profit;
        li.innerHTML = `📈 ${item.stockSymbol}（${item.shares} 股）現價 ${item.price}｜市值 ${marketValue.toFixed(2)}（盈餘 ${profit.toFixed(2)}）`;
      } else if (item.type === "儲蓄保險") {
        value = item.policyAmount;
        li.innerHTML = `📄 ${item.policyName}｜保額 ${item.policyAmount}`;
      } else if (item.type === "基金") {
        value = item.fundUnits * item.fundNav;
        li.innerHTML = `💼 ${item.fundName}｜單位 ${item.fundUnits}｜淨值 ${item.fundNav}`;
      } else if (item.type === "加密貨幣") {
        value = item.cryptoAmount * item.cryptoPrice;
        li.innerHTML = `🪙 ${item.cryptoSymbol}｜數量 ${item.cryptoAmount}｜價格 ${item.cryptoPrice}`;
      } else {
        value = item.amount;
        li.innerHTML = `💰 ${item.type}：${value}`;
      }

      totals[item.currency] = (totals[item.currency] || 0) + value;

      li.innerHTML += ` <button onclick="editAsset(${index})">✏️</button> <button onclick="deleteAsset(${index})">🗑️</button>`;
      assetList.appendChild(li);
    });

    // 顯示幣別加總
    for (const [currency, total] of Object.entries(totals)) {
      const li = document.createElement("li");
      li.textContent = `${currency}：${total.toFixed(2)}`;
      totalsList.appendChild(li);
    }

    // 顯示股票盈餘
    for (const [currency, profit] of Object.entries(profits)) {
      const li = document.createElement("li");
      li.textContent = `📊 股票盈餘（${currency}）：${profit.toFixed(2)}`;
      profitList.appendChild(li);
    }
  } catch (e) {
    console.error("❌ render() 錯誤：", e);
  }
}

// ===== Part 4：啟動函式與其他 =====
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("🔄 系統初始化中...");

    // 監聽登入
    if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.initAuth) {
      await FINORA_AUTH.initAuth();
    }

    await fetchExchangeRates();         // 匯率查詢
    await updateAllStockPrices();       // 股票查價（含美股與台股）
    toggleFields();                     // 表單欄位顯示處理
    render();                           // 畫面顯示
    console.log("✅ 初始化完成");
  } catch (e) {
    console.error("❌ 初始化失敗", e);
    alert("系統初始化錯誤，請重新整理頁面");
  }
});
