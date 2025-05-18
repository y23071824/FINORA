
document.addEventListener("DOMContentLoaded", () => {
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

      if (!data || !data.rates || Object.keys(data.rates).length === 0) {
        throw new Error("API 回傳資料為空");
      }

      exchangeRates = data.rates;
      exchangeRates["TWD"] = 30.21; // 可自訂台幣匯率
      localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
    } catch (e) {
      console.error("⚠️ 匯率 API 失敗，使用預設值", e);
      exchangeRates = {
        USD: 1,
        TWD: 30.21,
        JPY: 151.4,
        EUR: 0.92
      };
      localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates));
      alert("⚠️ 無法取得即時匯率，已使用預設值（僅供參考）");
    }
  }

  // ... 省略中間重複部分，完整 render() 末尾加上這段反向匯率顯示

  function render() {
    if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
      exchangeRates = JSON.parse(localStorage.getItem("exchangeRates") || "{}");
    }

    assetList.innerHTML = "";
    totalsList.innerHTML = "";
    profitList.innerHTML = "";
    let totals = {}, profits = {}, totalTWD = 0;

    assets.forEach((item, index) => {
      let display = "", currency = item.currency, amount = 0, profit = 0;

      if (item.type === "股票") {
        const cost = item.shares * item.cost;
        const value = item.shares * item.price;
        profit = value - cost;
        amount = cost;
        profits[currency] = (profits[currency] || 0) + profit;
        display = `股票代碼：${item.stockSymbol}｜類型：${item.stockCategory}｜股數：${item.shares}<br>成本：$${item.cost}，現價：$${item.price}<br>總成本：$${cost.toFixed(2)}，市值：$${value.toFixed(2)}，盈餘：$${profit.toFixed(2)}`;
      } else if (item.type === "儲蓄保險") {
        amount = parseFloat(item.policyAmount) || 0;
        display = `保單：${item.policyName}<br>保額：$${item.policyAmount}，年期：${item.policyYears}，保費：$${item.policyPremium}`;
      } else {
        amount = parseFloat(item.amount) || 0;
        display = `金額：$${amount.toLocaleString()}`;
      }

      totals[currency] = (totals[currency] || 0) + amount;

      const li = document.createElement("li");
      li.innerHTML = `<strong>${item.type}</strong>（${currency}｜${item.bank}）${item.note ? "｜備註：" + item.note : ""}<br>${display}
        <div class="button-group">
          <button onclick="editAsset(${index})">編輯</button>
          <button onclick="deleteAsset(${index})">刪除</button>
        </div>`;
      assetList.appendChild(li);
    });

    for (const ccy in totals) {
      const total = totals[ccy] + (profits[ccy] || 0);
      const rate = parseFloat(exchangeRates[ccy]) || 0;
      const twd = rate * total;
      totalTWD += twd;

      const li = document.createElement("li");
      li.innerHTML = `${ccy} 總資產：$${total.toLocaleString()}（盈餘 $${(profits[ccy] || 0).toLocaleString()}）<br>折合台幣：NT$ ${twd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      totalsList.appendChild(li);
    }

    const totalLine = document.createElement("li");
    totalLine.style.fontWeight = "bold";
    totalLine.textContent = `全體總資產（折合台幣）：NT$ ${totalTWD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    totalsList.appendChild(totalLine);

    for (const ccy in profits) {
      const li = document.createElement("li");
      li.textContent = `${ccy} 股票盈餘：$${profits[ccy].toLocaleString()}`;
      profitList.appendChild(li);
    }

    const reverseRate = document.createElement("li");
    const usdRate = (1 / (exchangeRates["TWD"] || 1)).toFixed(3);
    const jpyRate = (exchangeRates["JPY"] / exchangeRates["TWD"]).toFixed(2);
    const eurRate = (exchangeRates["EUR"] / exchangeRates["TWD"]).toFixed(3);
    reverseRate.innerHTML = `📌 1 TWD ≈ ${usdRate} USD｜${jpyRate} JPY｜${eurRate} EUR`;
    reverseRate.style.fontSize = "0.95em";
    reverseRate.style.color = "#666";
    totalsList.appendChild(reverseRate);
  }

  fetchExchangeRates().then(() => {
    toggleFields();
    render();
  });
});
