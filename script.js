// ===== Finora 資產登記 App =====

// ===== Part 1：初始化與匯率查詢 =====
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

window.dom = dom;
window.assets = JSON.parse(localStorage.getItem("assets") || "[]");
window.bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");
window.exchangeRates = {};
window.editIndex = null;

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
    asset.stockCategory = document.getElementById("stock-category").value;
    asset.stockSymbol = document.getElementById("stock-symbol").value;
    asset.shares = parseFloat(document.getElementById("shares").value) || 0;
    asset.cost = parseFloat(document.getElementById("cost").value) || 0;
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

// ===== Part 3：畫面渲染與計算 =====

function render() {
  try {
    dom.assetList.innerHTML = "";
    dom.totalsList.innerHTML = "";
    dom.profitList.innerHTML = "";

    const totals = {};
    const profits = {};
    let totalTWD = 0;

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

      const exRate = exchangeRates[item.currency] || 1;
      totalTWD += value * exRate;

      li.innerHTML += ` <button onclick="editAsset(${index})">✏️</button> <button onclick="deleteAsset(${index})">🗑️</button>`;
      dom.assetList.appendChild(li);
    });

    for (const [currency, total] of Object.entries(totals)) {
      const li = document.createElement("li");
      li.textContent = `${currency}：${total.toFixed(2)}`;
      dom.totalsList.appendChild(li);
    }

    for (const [currency, profit] of Object.entries(profits)) {
      const li = document.createElement("li");
      li.textContent = `📊 股票盈餘（${currency}）：${profit.toFixed(2)}`;
      dom.profitList.appendChild(li);
    }

    const final = document.createElement("li");
    final.innerHTML = `<strong>💎 總資產折合台幣：${totalTWD.toLocaleString("zh-Hant", { minimumFractionDigits: 0 })} TWD</strong>`;
    dom.totalsList.appendChild(final);
  } catch (e) {
    console.error("❌ render() 錯誤：", e);
  }
}
// ===== Part 4：啟動函式與其他 =====

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("🔄 系統初始化中...");

    // 監聽登入狀態與帳戶初始化
    if (typeof FINORA_AUTH !== "undefined" && FINORA_AUTH.initAuth) {
      await FINORA_AUTH.initAuth();
    }

    if (typeof fetchExchangeRates === "function") {
      await fetchExchangeRates();
    } else {
      console.warn("⚠️ 無法載入 fetchExchangeRates()");
    }

    if (typeof updateAllStockPrices === "function") {
      await updateAllStockPrices();
    } else {
      console.warn("⚠️ 無法載入 updateAllStockPrices()");
    }

    toggleFields();
    render();

    console.log("✅ 初始化完成");
  } catch (e) {
    console.error("❌ 初始化失敗", e);
    alert("系統初始化錯誤，請重新整理頁面");
  }
});
