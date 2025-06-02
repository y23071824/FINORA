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
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=TWD,JPY,EUR", {
  cache: "no-store"
});
    const data = await res.json();

    if (!data || !data.rates) throw new Error("無效匯率資料");

    exchangeRates = data.rates;
    exchangeRates["USD"] = 1;
    exchangeRates["TWD"] = exchangeRates["TWD"] || 30;
    exchangeRates["JPY"] = exchangeRates["JPY"] || 150;
    exchangeRates["EUR"] = exchangeRates["EUR"] || 0.9;

    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
  } catch (e) {
    console.warn("⚠️ 匯率查詢失敗，改用本地資料");
    try {
      const stored = localStorage.getItem("exchangeRates");
      if (stored && stored !== "undefined") {
        exchangeRates = JSON.parse(stored);
      } else {
        throw new Error("無效本地資料");
      }
    } catch {
      exchangeRates = { USD: 1, TWD: 30, JPY: 150, EUR: 0.9 };
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

// 切換欄位顯示
function toggleFields() {
  const type = document.getElementById("type").value;
  document.getElementById("stock-fields").style.display = type === "股票" ? "block" : "none";
  document.getElementById("insurance-fields").style.display = type === "儲蓄保險" ? "block" : "none";
  document.getElementById("fund-fields").style.display = type === "基金" ? "block" : "none";
  document.getElementById("crypto-fields").style.display = type === "加密貨幣" ? "block" : "none";
  document.getElementById("amount-field").style.display = ["定存", "現金", "房產", "其他"].includes(type) ? "block" : "none";
}

// 儲存資產表單
async function handleSubmit(e) {
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

  // ✅ 雲端同步（等待儲存完成再 render）
  if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
    await FINORA_AUTH.saveUserAssets(assets);
  }

  form.reset();
  toggleFields();
  render();
}

// 編輯資產
function handleEdit(index) {
  document.getElementById("asset-form").scrollIntoView({ behavior: "smooth" });
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

// 刪除資產
function handleDelete(index) {
  if (!confirm("確定要刪除這筆資產嗎？")) return;
  assets.splice(index, 1);
  localStorage.setItem(getLocalStorageKey(), JSON.stringify(assets));
  if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
    FINORA_AUTH.saveUserAssets(assets);
  }
  render();
}

// ===== Part 3：畫面渲染與計算 =====

function render() {
  assetList.innerHTML = "";
  totalsList.innerHTML = "";
  profitList.innerHTML = "";

  const totalsByType = {};     // 各類型-幣別加總，例如：股票-USD
  const profitsByType = {};    // 各類盈餘（股票、加密貨幣）
  const totalsByCurrency = {}; // 幣別加總
  let totalTWD = 0;

  assets.forEach((item, i) => {
    const li = document.createElement("li");
    const details = [];

    if (item.type === "股票") {
      details.push(`代碼: ${item.stockSymbol}`);
      details.push(`類型: ${item.stockCategory}`);
      details.push(`股數: ${item.shares}`);
      details.push(`成本: ${item.cost}`);
      details.push(`現價: ${item.price}`);
    } else if (item.type === "儲蓄保險") {
      details.push(`名稱: ${item.insuranceName}`);
      details.push(`保額: ${item.insuranceAmount}`);
      details.push(`年期: ${item.insuranceYears}`);
      details.push(`年繳: ${item.insurancePayment}`);
    } else if (item.type === "基金") {
      details.push(`名稱: ${item.fundName}`);
      details.push(`單位: ${item.fundUnits}`);
      details.push(`淨值: ${item.fundNav}`);
    } else if (item.type === "加密貨幣") {
      details.push(`幣種: ${item.cryptoSymbol}`);
      details.push(`數量: ${item.cryptoAmount}`);
      details.push(`現價: ${item.cryptoPrice}`);
    } else {
      details.push(`金額: ${item.amount}`);
    }

    details.push(`幣別: ${item.currency}`);
    if (item.bank) details.push(`銀行: ${item.bank}`);
    if (item.note) details.push(`備註: ${item.note}`);
    li.innerHTML = `<strong>${item.type}</strong>｜${details.join("，")}`;

    // 👉 計算市值
    let marketValue = 0;
    if (item.type === "股票") {
      marketValue = item.shares * item.price;
    } else if (item.type === "儲蓄保險") {
      marketValue = item.insuranceAmount;
    } else if (item.type === "基金") {
      marketValue = item.fundUnits * item.fundNav;
    } else if (item.type === "加密貨幣") {
      marketValue = item.cryptoAmount * item.cryptoPrice;
    } else {
      marketValue = item.amount || 0;
    }

    // 👉 計算盈餘
    let profit = 0;
    if ((item.type === "股票" || item.type === "加密貨幣") && item.cost) {
      const costBasis = item.shares
        ? item.shares * item.cost
        : item.cryptoAmount * item.cost;
      profit = marketValue - costBasis;
    }

    // 👉 顯示市值與盈餘
    const valueEl = document.createElement("div");
    valueEl.style.fontSize = "0.9rem";
    valueEl.style.color = "#555";
    const sign = profit > 0 ? "+" : "";
    valueEl.textContent = profit !== 0
      ? `👉 市值：約 ${item.currency} ${marketValue.toLocaleString()}（盈餘 ${sign}${Math.round(profit).toLocaleString()}）`
      : `👉 市值：約 ${item.currency} ${marketValue.toLocaleString()}`;
    li.appendChild(valueEl);

    // 👉 編輯與刪除按鈕
    const actionDiv = document.createElement("div"); // ✅ 原本是 span，改為 div 才能套用 flex
actionDiv.className = "asset-actions";

// 按鈕：修改
const editBtn = document.createElement("button");
editBtn.textContent = "✏️ 修改";
editBtn.onclick = () => handleEdit(i);

// 按鈕：刪除
const deleteBtn = document.createElement("button");
deleteBtn.textContent = "🗑️ 刪除";
deleteBtn.onclick = () => handleDelete(i);

// 按鈕加入區塊
actionDiv.appendChild(editBtn);
actionDiv.appendChild(deleteBtn);
li.appendChild(actionDiv);
assetList.appendChild(li);

    // 👉 資料加總
    const currency = item.currency || "TWD";
    const type = item.type;
    const typeKey = `${type}-${currency}`;

    if (!totalsByType[typeKey]) totalsByType[typeKey] = 0;
    totalsByType[typeKey] += marketValue;

    if ((type === "股票" || type === "加密貨幣") && item.cost) {
      if (!profitsByType[typeKey]) profitsByType[typeKey] = 0;
      profitsByType[typeKey] += profit;
    }

    if (!totalsByCurrency[currency]) totalsByCurrency[currency] = 0;
    totalsByCurrency[currency] += marketValue;
  });

  // 👉 顯示資產分類加總（依幣別）
  const groupTitle = document.createElement("li");
  groupTitle.innerHTML = "<b>📊 資產分類加總（依幣別，含盈餘）：</b>";
  totalsList.appendChild(groupTitle);

  for (const [typeKey, value] of Object.entries(totalsByType)) {
    const [type, currency] = typeKey.split("-");
    const profit = profitsByType[typeKey] ? `（盈餘 ${Math.round(profitsByType[typeKey]).toLocaleString()}）` : "";
    const line = document.createElement("li");
    line.textContent = `${type}（${currency}）：${value.toLocaleString()} ${profit}`;
    totalsList.appendChild(line);
  }

  // 👉 幣別總額與台幣折算
  const groupTitle2 = document.createElement("li");
  groupTitle2.innerHTML = "<br><b>幣別總額與折合台幣（含浮動市值）：</b>";
  totalsList.appendChild(groupTitle2);

  totalTWD = 0;
  for (const [cur, amt] of Object.entries(totalsByCurrency)) {
    let rate = 1;
    const usdToTwd = exchangeRates["TWD"] || 30;
    if (cur === "TWD") {
      rate = 1;
    } else if (cur === "USD") {
      rate = usdToTwd;
    } else {
      const toUsd = 1 / exchangeRates[cur];
      rate = toUsd * usdToTwd;
    }
    const converted = amt * rate;
    totalTWD += converted;

    const line = document.createElement("li");
    line.textContent = `${cur}：${amt.toFixed(2)}（約 TWD ${converted.toFixed(0)}）`;
    totalsList.appendChild(line);
  }

  const totalLi = document.createElement("li");
  totalLi.innerHTML = `<br><b>總資產（折合台幣）：</b> ${new Intl.NumberFormat('zh-Hant', {
    style: 'currency',
    currency: 'TWD'
  }).format(totalTWD)}`;
  totalsList.appendChild(totalLi);
}

// ===== Part 4：啟動函式與其他 =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔄 系統初始化中...");

  FINORA_AUTH.onUserChanged(async (user) => {
    const emailEl = document.getElementById("auth-email");
    const accountEl = document.getElementById("account-name");
    const MAX_ACCOUNT_COUNT = 3;

    if (!user) {
      if (emailEl) emailEl.textContent = "（尚未登入）";
      if (accountEl) accountEl.textContent = "（尚未選擇）";
      alert("⚠️ 尚未登入，請先登入 Google 帳號");
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

      // 顯示使用者與帳本名稱＋帳本數提示
      const accountId = getSelectedAccount();
      const list = await FINORA_AUTH.fetchAccountList();
      const displayName = list.find(acc => acc.id === accountId)?.displayName || accountId;
      if (emailEl) emailEl.textContent = user.email;
      if (accountEl) accountEl.textContent = `${displayName}（${list.length} / ${MAX_ACCOUNT_COUNT}）`;

      // 表單綁定
      form.addEventListener("submit", handleSubmit);
      typeSelect.addEventListener("change", toggleFields);

      // 銀行記憶選單
      bankHistory.forEach((b) => {
        const option = document.createElement("option");
        option.value = b;
        bankDatalist.appendChild(option);
      });

      // 股票查價綁定
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

      // 加密貨幣查價綁定
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

      // 執行初始化流程
      await fetchExchangeRates();
      await updateAllStockPrices();
      assets = JSON.parse(localStorage.getItem(getLocalStorageKey()) || "[]");
      toggleFields();
      render();
      console.log("✅ 初始化完成");

    } catch (e) {
      console.error("❌ 初始化失敗", e);
      alert("系統初始化錯誤，請重新整理頁面");
    }
  });
});

