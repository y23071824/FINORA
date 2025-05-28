// ===== Finora 資產登記 App =====
// ===== Part 1：初始化與匯率查詢 =====
document.addEventListener("DOMContentLoaded", async () => {
  // 取得畫面中會用到的 HTML 元件
  const form = document.getElementById("asset-form");
  const typeSelect = document.getElementById("type");
  const stockFields = document.getElementById("stock-fields");
  const insuranceFields = document.getElementById("insurance-fields");
  const fundFields = document.getElementById("fund-fields");
  const cryptoFields = document.getElementById("crypto-fields");
  const amountField = document.getElementById("amount-field");
  const assetList = document.getElementById("asset-list");
  const totalsList = document.getElementById("totals-list");
  const profitList = document.getElementById("stock-profit-list");
  const bankDatalist = document.getElementById("bank-list");

  // 初始化本地資料變數（讀取 localStorage）
  let assets = JSON.parse(localStorage.getItem("assets") || "[]");         // 所有資產項目
  let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");    // 銀行記憶清單
  let exchangeRates = {};                                                 // 即時匯率資料
  let editIndex = null;                                                   // 是否處於「編輯模式」

  // ===== 🔐 Firebase 使用者狀態監聽與同步處理 =====
  if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.onUserChanged) {
    FINORA_AUTH.onUserChanged(async (user) => {
      if (user) {
        console.log("🔐 使用者已登入：", user.email);
        try {
          assets = await FINORA_AUTH.loadUserAssets();
          localStorage.setItem("assets", JSON.stringify(assets));
        } catch (e) {
          console.warn("⚠️ 雲端資料載入失敗", e);
        }
      } else {
        console.log("🚪 使用者尚未登入");
        assets = [];
        localStorage.removeItem("assets");
      }
      render(); // 渲染畫面（不論登入與否）
    });
  }

  // ===== 🔄 匯率與股票資料初始化 =====
  try {
    await fetchExchangeRates();
    console.log("✅ 匯率查詢完成");

    await updateAllStockPrices();
    console.log("✅ 股票現價更新完成");
  } catch (e) {
    console.warn("⚠️ 匯率或股價查詢失敗", e);
  }

  toggleFields(); // 顯示正確欄位
  render();       // 初始畫面渲染
  console.log("✅ 初始化完成");
});

// ===== 匯率查詢函式 =====
async function fetchExchangeRates() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();

    if (!data || !data.rates) throw new Error("API 回傳格式錯誤");

    // 成功取得即時匯率（以 USD 為基準），只取用 TWD, JPY, EUR
    exchangeRates = {
      USD: 1,
      TWD: data.rates.TWD,
      JPY: data.rates.JPY,
      EUR: data.rates.EUR,
    };

    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates)); // 儲存備用
  } catch (e) {
    console.warn("⚠️ 匯率 API 失敗，使用預設值", e);

    // 備援匯率（避免整個畫面掛掉）
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
      // 查詢台灣證交所日收盤價
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

      // 取最新一筆收盤價（第七欄是收盤）
      const lastRow = data.data[data.data.length - 1];
      const close = parseFloat(lastRow[6].replace(/,/g, ""));
      return close;

    } else {
      // 使用 TwelveData 查美股、ETF、港股、REITs
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
  localStorage.setItem("assets", JSON.stringify(assets)); // 儲存更新後價格
}

// ===== Part 2：表單處理與存儲 =====

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

// 當輸入幣種代碼後，查詢現價自動填入
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

  // 根據不同資產類型填入對應資料
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

  // 儲存或更新資產項目
  if (editIndex !== null) {
    assets[editIndex] = asset;
    editIndex = null;
  } else {
    assets.push(asset);
  }

  // 寫入 localStorage 與銀行記憶
  localStorage.setItem("assets", JSON.stringify(assets));
  if (asset.bank && !bankHistory.includes(asset.bank)) {
    bankHistory.push(asset.bank);
    localStorage.setItem("banks", JSON.stringify(bankHistory));
  }

  alert("✅ 資產已成功儲存！");
    // 若登入中，則同步儲存到雲端
if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
  FINORA_AUTH.saveUserAssets(assets).then(() => {
    console.log("✅ 雲端儲存成功");
  }).catch((err) => {
    console.warn("⚠️ 雲端儲存失敗", err);
  });
}
  form.reset();
  toggleFields(); // 重置欄位顯示狀態
  render();       // 更新畫面

});

// ===== 編輯現有資產（將資料填入表單）=====
window.editAsset = function (index) {
  const item = assets[index];
  editIndex = index;

  typeSelect.value = item.type;
  document.getElementById("currency").value = item.currency;
  document.getElementById("bank").value = item.bank;
  document.getElementById("note").value = item.note;

  toggleFields(); // 顯示對應欄位

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

  window.scrollTo({ top: 0, behavior: "smooth" }); // 滾到表單上方
};

// ===== 刪除資產項目 =====
window.deleteAsset = function (index) {
  if (confirm("確定要刪除？")) {
    assets.splice(index, 1);
    localStorage.setItem("assets", JSON.stringify(assets));
// ✅ 雲端同步
  if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
    FINORA_AUTH.saveUserAssets(assets)
      .then(() => {
        console.log("✅ 雲端已同步（刪除後）");
      })
      .catch((err) => {
        console.warn("⚠️ 雲端同步失敗（刪除後）", err);
      });
  }
    render(); // 重新渲染畫面
  }
};

// ===== Part 3：畫面渲染與加總邏輯 =====
function render() {
  assetList.innerHTML = "";
  totalsList.innerHTML = "";
  profitList.innerHTML = "";

  const currencyTotals = {}; // 各幣別市值
  const stockProfits = {};   // 各幣別盈餘

  assets.forEach((item, index) => {
    // 計算各類型資產的市值與盈餘
    let marketValue = 0;
    if (item.type === "股票") {
      marketValue = item.price * item.shares;
      const costTotal = item.cost * item.shares;
      const profit = marketValue - costTotal;

      // 累加盈餘
      if (!stockProfits[item.currency]) stockProfits[item.currency] = 0;
      stockProfits[item.currency] += profit;

    } else if (item.type === "基金") {
      marketValue = item.fundUnits * item.fundNav;

    } else if (item.type === "加密貨幣") {
      marketValue = item.cryptoAmount * item.cryptoPrice;

    } else if (item.type === "儲蓄保險") {
      marketValue = item.policyAmount;

    } else {
      marketValue = item.amount;
    }

    // 累加各幣別總市值
    if (!currencyTotals[item.currency]) currencyTotals[item.currency] = 0;
    currencyTotals[item.currency] += marketValue;

    // 渲染單筆資產
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.type}</strong>｜${item.note || "無備註"}｜${item.currency} ${(marketValue || 0).toFixed(2)}
      <button onclick="editAsset(${index})">✏️</button>
      <button onclick="deleteAsset(${index})">🗑️</button>
    `;
    assetList.appendChild(li);
  });

  // 渲染幣別加總
  Object.keys(currencyTotals).forEach(cur => {
    const rate = exchangeRates[cur] || 1;
    const valueTWD = currencyTotals[cur] * rate;
    const li = document.createElement("li");
    li.textContent = `${cur} ${(currencyTotals[cur]).toFixed(2)}（約 NT$ ${valueTWD.toFixed(0)}）`;
    totalsList.appendChild(li);
  });

  // 渲染股票盈餘
  Object.keys(stockProfits).forEach(cur => {
    const profit = stockProfits[cur];
    const li = document.createElement("li");
    li.textContent = `${cur} 股票盈餘：${profit >= 0 ? "+" : ""}${profit.toFixed(2)}`;
    profitList.appendChild(li);
  });
}

// ===== Part 4：啟動函式與初始化流程 =====
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await fetchExchangeRates();
    console.log("✅ 匯率查詢完成");

    await updateAllStockPrices();
    console.log("✅ 股票現價更新完成");

    toggleFields();

    // 首次畫面渲染
    render();

    console.log("✅ 初始化完成");
  } catch (e) {
    console.error("❌ 初始化失敗", e);
    alert("系統初始化錯誤，請重新整理頁面");
  }
});

