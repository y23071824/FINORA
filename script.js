document.addEventListener("DOMContentLoaded", () => {
// ===== Part 1：初始化與匯率查詢 =====
const form = document.getElementById("asset-form");
const typeSelect = document.getElementById("type");
const stockFields = document.getElementById("stock-fields");
const insuranceFields = document.getElementById("insurance-fields");
const amountField = document.getElementById("amount-field");
const assetList = document.getElementById("asset-list");
const totalsList = document.getElementById("totals-list");
const profitList = document.getElementById("stock-profit-list");
const bankDatalist = document.getElementById("bank-list");

let assets = JSON.parse(localStorage.getItem("assets") || "[]");
let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");
let exchangeRates = {};
let editIndex = null;

async function fetchExchangeRates() {
  try {
    const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=TWD,JPY,EUR");
    const data = await res.json();

    if (!data || !data.rates) throw new Error("API 無效或回傳格式錯誤");

    exchangeRates = {
      USD: 1,
      TWD: data.rates.TWD || 30.21,
      JPY: data.rates.JPY || 151.4,
      EUR: data.rates.EUR || 0.92
    };
    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
  } catch (e) {
    console.warn("⚠️ 匯率 API 失敗，使用預設值", e);
    exchangeRates = {
      USD: 1,
      TWD: 30.21,
      JPY: 151.4,
      EUR: 0.92
    };
    localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
  }
}

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
      if (data.status === "error" || data.code || !data.price) {
        console.warn("Twelve Data 回傳錯誤：", data);
        return null;
      }
      return parseFloat(data.price);
    }
  } catch (e) {
    console.error("查詢股價錯誤", e);
    alert("查詢失敗，請檢查代碼或稍後再試");
    return null;
  }
}

async function updateAllStockPrices() {
  const updatedAssets = await Promise.all(assets.map(async (item) => {
    if (item.type === "股票" && item.stockSymbol && item.stockCategory) {
      const newPrice = await fetchStockPrice(item.stockSymbol, item.stockCategory);
      if (newPrice !== null) {
        item.price = newPrice;
      }
    }
    return item;
  }));
  assets = updatedAssets;
  localStorage.setItem("assets", JSON.stringify(assets));
}
// ===== Part 2：表單處理與存儲 =====
function toggleFields() {
  const type = typeSelect.value;
  stockFields.style.display = type === "股票" ? "block" : "none";
  insuranceFields.style.display = type === "儲蓄保險" ? "block" : "none";
  amountField.style.display = (type !== "股票" && type !== "儲蓄保險") ? "block" : "none";
}

typeSelect.addEventListener("change", toggleFields);

document.getElementById("stock-symbol")?.addEventListener("blur", async () => {
  const symbol = document.getElementById("stock-symbol").value.trim().toUpperCase();
  const category = document.getElementById("stock-category").value;
  if (!symbol || !category) return;
  const price = await fetchStockPrice(symbol, category);
  if (price !== null) document.getElementById("price").value = price.toFixed(2);
  else alert("查無此股票代碼或查價失敗");
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const type = typeSelect.value;
  if (!type) return alert("⚠️ 請選擇資產種類");

  const asset = {
    type,
    currency: document.getElementById("currency").value,
    bank: document.getElementById("bank").value,
    note: document.getElementById("note").value
  };

  if (type === "股票") {
    const shares = parseFloat(document.getElementById("shares").value);
    const cost = parseFloat(document.getElementById("cost").value);
    if (isNaN(shares) || isNaN(cost)) {
      return alert("⚠️ 股票類別請填寫股數與成本");
    }
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
  form.reset();
  toggleFields();
  render();
});

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
  } else {
    document.getElementById("amount").value = item.amount;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteAsset = function (index) {
  if (confirm("確定要刪除？")) {
    assets.splice(index, 1);
    localStorage.setItem("assets", JSON.stringify(assets));
    render();
  }
};

   // ===== Part 3：畫面渲染與計算 =====
 window.convertCurrency = function () {
  const amt = parseFloat(document.getElementById("input-amount")?.value);
  const rate = parseFloat(document.getElementById("input-rate")?.value);
  const result = document.getElementById("converted-result");
  if (isNaN(amt) || isNaN(rate)) {
    result.textContent = "請輸入正確金額與匯率";
  } else {
    result.textContent = `換算後金額：$${(amt * rate).toLocaleString()}`;
  }
};

function render() {
  try {
    if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
      exchangeRates = JSON.parse(localStorage.getItem("exchangeRates") || "{}");
    }

    assetList.innerHTML = "";
    totalsList.innerHTML = "";
    profitList.innerHTML = "";
    let totals = {}, profits = {}, totalTWD = 0;

    const sortedAssets = [
      ...assets.filter(a => a.type === "股票"),
      ...assets.filter(a => a.type === "儲蓄保險"),
      ...assets.filter(a => a.type !== "股票" && a.type !== "儲蓄保險")
    ];

    sortedAssets.forEach((item, index) => {
      let display = "", currency = item.currency, amount = 0, profit = 0;

      if (item.type === "股票") {
        const shares = parseFloat(item.shares) || 0;
        const cost = parseFloat(item.cost) || 0;
        const price = parseFloat(item.price) || 0;
        const totalCost = shares * cost;
        const value = shares * price;
        profit = value - totalCost;
        amount = isNaN(totalCost) ? 0 : totalCost;
        profits[currency] = (profits[currency] || 0) + profit;

        display = `股票代碼：${item.stockSymbol}｜類型：${item.stockCategory}｜股數：${shares}<br>
成本：$${cost}，現價：$${price}<br>
總成本：$${totalCost.toFixed(2)}，市值：$${value.toFixed(2)}，盈餘：$${profit.toFixed(2)}`;
      } else if (item.type === "儲蓄保險") {
        amount = parseFloat(item.policyAmount) || 0;
        display = `保單：${item.policyName}<br>
保額：$${item.policyAmount}，年期：${item.policyYears}，保費：$${item.policyPremium}`;
      } else {
        amount = parseFloat(item.amount) || 0;
        display = `金額：$${amount.toLocaleString()}`;
      }

      totals[currency] = (totals[currency] || 0) + amount;

      const exchangeRateUsed = exchangeRates["TWD"] / (exchangeRates[currency] || 1);
      const li = document.createElement("li");
      li.innerHTML = `<strong>${item.type}</strong>（${currency}｜${item.bank}）${item.note ? "｜備註：" + item.note : ""}<br>
${display}<br><small style="color: #888;">折算匯率：1 ${currency} ≈ NT$ ${exchangeRateUsed.toFixed(2)}</small>
<div class="button-group">
  <button onclick="editAsset(${index})">編輯</button>
  <button onclick="deleteAsset(${index})">刪除</button>
</div>`;
      assetList.appendChild(li);
    });

    const rateInfo = document.createElement("li");
    rateInfo.innerHTML = `<strong>目前匯率（以 USD 為基準）</strong><br>
1 USD → TWD：${parseFloat(exchangeRates["TWD"] || 0).toFixed(2)}，
JPY：${parseFloat(exchangeRates["JPY"] || 0).toFixed(2)}，
EUR：${parseFloat(exchangeRates["EUR"] || 0).toFixed(2)}`;
    totalsList.appendChild(rateInfo);

    for (const ccy in totals) {
      const total = totals[ccy] + (profits[ccy] || 0);
      const rate = exchangeRates[ccy] || 1;
      const twd = total * (exchangeRates["TWD"] / rate);
      totalTWD += twd;

      const li = document.createElement("li");
      li.innerHTML = `${ccy} 總資產：$${total.toLocaleString()}（盈餘 $${(profits[ccy] || 0).toLocaleString()}）<br>折合台幣：NT$ ${twd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      totalsList.appendChild(li);
    }

    const totalLine = document.createElement("li");
    totalLine.style.fontWeight = "bold";
    totalLine.textContent = `全體總資產（折合台幣）：NT$ ${totalTWD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    totalsList.appendChild(totalLine);

    const reverseRate = document.createElement("li");
    const usdRate = (1 / (exchangeRates["TWD"] || 1)).toFixed(3);
    const jpyRate = (exchangeRates["JPY"] / exchangeRates["TWD"]).toFixed(2);
    const eurRate = (exchangeRates["EUR"] / exchangeRates["TWD"]).toFixed(3);
    reverseRate.innerHTML = `📌 1 TWD ≈ ${usdRate} USD｜${jpyRate} JPY｜${eurRate} EUR`;
    reverseRate.style.fontSize = "0.95em";
    reverseRate.style.color = "#666";
    totalsList.appendChild(reverseRate);

    for (const ccy in profits) {
      const li = document.createElement("li");
      li.textContent = `${ccy} 股票盈餘：$${profits[ccy].toLocaleString()}`;
      profitList.appendChild(li);
    }

    // 匯率更新時間
    const updateTime = new Date().toLocaleString();
    document.getElementById("rate-time").textContent = `匯率更新時間：${updateTime}`;

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
// ===== Part 4：啟動函式與其他 =====
fetchExchangeRates().then(() => {
  updateAllStockPrices().then(() => {
    toggleFields();
    render();
  });
});
});

