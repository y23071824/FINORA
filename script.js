// ===== Finora 資產登記 App =====

// ===== Part 1：初始化與匯率查詢 =====
document.addEventListener("DOMContentLoaded", async () => {
  const dom = {
    form: document.getElementById("asset-form"),
    typeSelect: document.getElementById("type"),
    stockFields: document.getElementById("stock-fields"),
    insuranceFields: document.getElementById("insurance-fields"),
    fundFields: document.getElementById("fund-fields"),
    cryptoFields: document.getElementById("crypto-fields"),
    amountField: document.getElementById("amount-field"),
    assetList: document.getElementById("asset-list"),
    totalsList: document.getElementById("totals-list"),
    profitList: document.getElementById("stock-profit-list"),
    bankDatalist: document.getElementById("bank-list")
  };

  window.dom = dom; // 讓其他區段也可使用

  window.assets = JSON.parse(localStorage.getItem("assets") || "[]");
  window.bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");
  window.exchangeRates = {};
  window.editIndex = null;

  try {
    await fetchExchangeRates();
    console.log("✅ 匯率查詢完成");

    await updateAllStockPrices();
    console.log("✅ 股票現價更新完成");

    toggleFields();

    if (FINORA_AUTH.getCurrentUser()) {
      FINORA_AUTH.saveUserAssets(assets)
        .then(() => console.log("✅ 雲端儲存成功"))
        .catch((err) => console.warn("⚠️ 雲端儲存失敗", err));
    } else {
      console.warn("⚠️ 未登入，無法同步雲端");
    }

    render();
    console.log("✅ 初始化完成");
  } catch (e) {
    console.error("❌ 初始化失敗", e);
    alert("系統初始化錯誤，請重新整理頁面");
  }
});


// ===== Part 2：表單處理與存儲 =====

function toggleFields() {
  const type = dom.typeSelect.value;
  dom.stockFields.style.display = type === "股票" ? "block" : "none";
  dom.insuranceFields.style.display = type === "儲蓄保險" ? "block" : "none";
  dom.fundFields.style.display = type === "基金" ? "block" : "none";
  dom.cryptoFields.style.display = type === "加密貨幣" ? "block" : "none";
  dom.amountField.style.display = ["現金", "定存", "房產", "其他"].includes(type) ? "block" : "none";
}

dom.typeSelect.addEventListener("change", toggleFields);

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

dom.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const type = dom.typeSelect.value;
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

  localStorage.setItem("assets", JSON.stringify(assets));
  if (asset.bank && !bankHistory.includes(asset.bank)) {
    bankHistory.push(asset.bank);
    localStorage.setItem("banks", JSON.stringify(bankHistory));
  }

  alert("✅ 資產已成功儲存！");
  if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
    FINORA_AUTH.saveUserAssets(assets).then(() => {
      console.log("✅ 雲端儲存成功");
    }).catch((err) => {
      console.warn("⚠️ 雲端儲存失敗", err);
    });
  }

  dom.form.reset();
  toggleFields();
  render();
});

window.editAsset = function (index) {
  const item = assets[index];
  editIndex = index;
  dom.typeSelect.value = item.type;
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

window.deleteAsset = function (index) {
  if (confirm("確定要刪除？")) {
    assets.splice(index, 1);
    localStorage.setItem("assets", JSON.stringify(assets));
    if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.saveUserAssets) {
      FINORA_AUTH.saveUserAssets(assets)
        .then(() => {
          console.log("✅ 雲端已同步（刪除後）");
        })
        .catch((err) => {
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
