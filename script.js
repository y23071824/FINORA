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

// ===== Part 3：畫面渲染與計算 =====
function render() {
  try {
    // 1. 取得匯率資料（從記憶體或 localStorage）
    if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
      exchangeRates = JSON.parse(localStorage.getItem("exchangeRates") || "{}");
    }

    // 2. 初始化畫面區塊
    assetList.innerHTML = "";
    totalsList.innerHTML = "";
    if (profitList) profitList.innerHTML = "";

    // 3. 宣告總和用變數
    let categoryTotals = {};  // 儲存各資產類型 + 幣別的加總
    let currencyTotals = {};  // 儲存幣別總額（含盈餘）
    let totalTWD = 0;         // 最後折合台幣的總資產

    // 4. 開始處理每筆資產資料
    assets.forEach((item, index) => {
      let display = "", amount = 0, profit = 0;

      if (item.type === "股票") {
        const shares = parseFloat(item.shares) || 0;
        const cost = parseFloat(item.cost) || 0;
        const price = parseFloat(item.price) || 0;
        const totalCost = shares * cost;
        const value = shares * price;
        profit = value - totalCost;
        amount = value;

        display = `股票代碼：${item.stockSymbol}｜類型：${item.stockCategory}｜股數：${shares}<br>
成本：$${cost}，現價：$${price}<br>
總成本：$${totalCost.toFixed(2)}，市值：$${value.toFixed(2)}，盈餘：$${profit.toFixed(2)}`;
      } else if (item.type === "儲蓄保險") {
        amount = parseFloat(item.policyAmount) || 0;
        display = `保單：${item.policyName}<br>
保額：$${item.policyAmount}，年期：${item.policyYears}，保費：$${item.policyPremium}`;
      } else if (item.type === "基金") {
        const units = parseFloat(item.fundUnits) || 0;
        const nav = parseFloat(item.fundNav) || 0;
        amount = units * nav;
        display = `基金：${item.fundName}<br>
單位數：${units}，淨值：$${nav}<br>
總市值：$${amount.toFixed(2)}`;
      } else if (item.type === "加密貨幣") {
        const qty = parseFloat(item.cryptoAmount) || 0;
        const price = parseFloat(item.cryptoPrice) || 0;
        amount = qty * price;
        display = `幣種：${item.cryptoSymbol}<br>
數量：${qty}，現價：$${price}<br>
總價值：$${amount.toFixed(2)}`;
      } else {
        amount = parseFloat(item.amount) || 0;
        display = `金額：$${amount.toLocaleString()}`;
      }

      const categoryKey = `${item.type}｜${item.currency}`;
      categoryTotals[categoryKey] = categoryTotals[categoryKey] || { amount: 0, profit: 0, currency: item.currency };
      categoryTotals[categoryKey].amount += amount;
      if (item.type === "股票") categoryTotals[categoryKey].profit += profit;

      currencyTotals[item.currency] = currencyTotals[item.currency] || 0;
      currencyTotals[item.currency] += amount;

      const li = document.createElement("li");
      li.innerHTML = `<strong>${item.type}</strong>（${item.currency}｜${item.bank}）${item.note ? "｜備註：" + item.note : ""}<br>
${display}
<div class="button-group">
  <button onclick="editAsset(${index})">編輯</button>
  <button onclick="deleteAsset(${index})">刪除</button>
</div>`;
      assetList.appendChild(li);
    });

    // 8. 渲染分類加總
    for (const key in categoryTotals) {
      const [type, currency] = key.split("｜");
      const item = categoryTotals[key];
      const rate = exchangeRates[currency] || 1;
      const total = item.amount;
      const twd = total * (exchangeRates["TWD"] / rate);
      totalTWD += twd;

      let line = `${type}（${currency}）：$${total.toLocaleString()} ${currency} ≈ NT$ ${twd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      if (item.profit && item.profit !== 0) {
        line += `（含股票盈餘：${item.profit >= 0 ? "+" : ""}${item.profit.toFixed(2)}）`;
      }

      const li = document.createElement("li");
      li.innerHTML = line;
      totalsList.appendChild(li);
    }

    // 9. 全體總資產與幣別列出
    const currencyBreakdown = Object.entries(currencyTotals).map(([ccy, value]) => `$${value.toLocaleString()} ${ccy}`).join("，");
    const totalLine = document.createElement("li");
    totalLine.style.fontWeight = "bold";
    totalLine.textContent = `全體總資產：${currencyBreakdown}，折合台幣：NT$ ${totalTWD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    totalsList.appendChild(totalLine);

    // 10. 匯率提示（正向）
    const rateTip = document.createElement("li");
    rateTip.innerHTML = `📌 1 USD = ${exchangeRates["TWD"]} TWD｜${exchangeRates["JPY"]} JPY｜${exchangeRates["EUR"]} EUR`;
    rateTip.style.fontSize = "0.95em";
    rateTip.style.color = "#666";
    totalsList.appendChild(rateTip);

    // 11. 匯率提示（反向）
    const reverseRate = document.createElement("li");
    const usdRate = (1 / (exchangeRates["TWD"] || 1)).toFixed(3);
    const jpyRate = (exchangeRates["JPY"] / exchangeRates["TWD"]).toFixed(2);
    const eurRate = (exchangeRates["EUR"] / exchangeRates["TWD"]).toFixed(3);
    reverseRate.innerHTML = `📌 1 TWD ≈ ${usdRate} USD｜${jpyRate} JPY｜${eurRate} EUR`;
    reverseRate.style.fontSize = "0.95em";
    reverseRate.style.color = "#666";
    totalsList.appendChild(reverseRate);

    // 12. 顯示匯率更新時間
    const updateTime = new Date().toLocaleString();
    document.getElementById("rate-time").textContent = `匯率更新時間：${updateTime}`;

    // 13. 銀行輸入提示記憶選項
    bankDatalist.innerHTML = "";
    bankHistory.forEach(bank => {
      const opt = document.createElement("option");
      opt.value = bank;
      bankDatalist.appendChild(opt);
    });

  } catch (e) {
    console.error("❌ render() 錯誤：", e);
    alert("畫面更新失敗，請檢查資料內容或重新整理");
  }
}

// ===== Part 4：啟動初始化流程 =====
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await fetchExchangeRates();
    console.log("✅ 匯率查詢完成");

    await updateAllStockPrices();
    console.log("✅ 股票現價更新完成");

    toggleFields();

    // 🔐 登入狀態下同步雲端資產
    if (FINORA_AUTH.getCurrentUser()) {
      FINORA_AUTH.saveUserAssets(assets)
        .then(() => console.log("✅ 雲端儲存成功"))
        .catch((err) => console.warn("⚠️ 雲端儲存失敗", err));
    } else {
      console.warn("⚠️ 未登入，無法同步雲端");
    }

    render(); // ✅ 確保畫面正常渲染
    console.log("✅ 初始化完成");
  } catch (e) {
    console.error("❌ 初始化失敗", e);
    alert("系統初始化錯誤，請重新整理頁面");
  }
});
