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
  let editIndex = null;

  // 取得匯率
  async function fetchExchangeRates() {
    try {
      const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=TWD,JPY,EUR");
      const data = await res.json();
      localStorage.setItem("exchangeRates", JSON.stringify(data.rates));
    } catch (e) {
      console.error("匯率載入失敗", e);
    }
  }

  // 取得股價
  async function fetchStockPrice(symbol) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`);
      const data = await res.json();
      const quote = data.quoteResponse.result[0];
      return quote?.regularMarketPrice || null;
    } catch (e) {
      console.error("股價查詢失敗", e);
      return null;
    }
  }

  // 股票代碼 blur 事件
  document.getElementById("stock-symbol")?.addEventListener("blur", async () => {
    const symbol = document.getElementById("stock-symbol").value.trim();
    if (symbol) {
      const price = await fetchStockPrice(symbol);
      if (price != null) document.getElementById("price").value = price;
    }
  });

  // 幣別切換提示匯率
  document.getElementById("currency")?.addEventListener("change", () => {
    const currency = document.getElementById("currency").value;
    const rates = JSON.parse(localStorage.getItem("exchangeRates") || "{}");
    if (["USD", "JPY", "EUR"].includes(currency)) {
      alert(`目前 ${currency} 對 TWD 匯率：約 ${rates[currency] || "查詢中"}`);
    }
  });

  function toggleFields() {
    const type = typeSelect.value;
    stockFields.style.display = type === "股票" ? "block" : "none";
    insuranceFields.style.display = type === "儲蓄保險" ? "block" : "none";
    amountField.style.display = type !== "股票" && type !== "儲蓄保險" ? "block" : "none";
  }

  typeSelect.addEventListener("change", toggleFields);

  function render() {
    assetList.innerHTML = "";
    totalsList.innerHTML = "";
    profitList.innerHTML = "";

    let totals = {}, profits = {};
    const grouped = {};

    assets.forEach((item, i) => {
      grouped[item.type] = grouped[item.type] || [];
      grouped[item.type].push({ item, i });
    });

    for (const type in grouped) {
      const h = document.createElement("h3");
      h.textContent = `【${type}】`;
      assetList.appendChild(h);

      grouped[type].forEach(({ item, i }) => {
        let extra = "", amount = 0, cur = item.currency;

        if (item.type === "股票") {
          const cost = item.shares * item.cost;
          const value = item.shares * item.price;
          const profit = value - cost;
          amount = cost;
          profits[cur] = (profits[cur] || 0) + profit;
          extra = `
            <br>股票代碼：${item.stockSymbol || "-"}
            <br>股票類型：${item.stockCategory}
            <br>股數：${item.shares}, 成本：$${item.cost}, 現價：$${item.price}
            <br>總成本：$${cost.toFixed(2)}, 市值：$${value.toFixed(2)}, 盈餘：$${profit.toFixed(2)}`;
        } else if (item.type === "儲蓄保險") {
          amount = item.policyAmount;
          extra = `
            <br>保單名稱：${item.policyName}
            <br>保額：$${item.policyAmount}, 年期：${item.policyYears} 年, 年繳保費：$${item.policyPremium}`;
        } else {
          amount = parseFloat(item.amount) || 0;
          extra = `<br>金額：$${amount.toLocaleString()}`;
        }

        totals[cur] = (totals[cur] || 0) + amount;

        const li = document.createElement("li");
        li.innerHTML = `
          ${cur} (${item.bank}) ${item.note ? '- ' + item.note : ''}
          ${extra}
          <div class="button-group">
            <button onclick="editAsset(${i})">往上編輯</button>
            <button onclick="deleteAsset(${i})">刪除</button>
          </div>
        `;
        assetList.appendChild(li);
      });
    }

    for (const c in totals) {
      const tv = totals[c] + (profits[c] || 0);
      const pv = profits[c] || 0;
      const li = document.createElement("li");
      li.textContent = `${c}: $${tv.toLocaleString()}（內含股票盈餘：$${pv.toLocaleString()}）`;
      totalsList.appendChild(li);
    }

    bankDatalist.innerHTML = "";
    bankHistory.forEach(b => {
      const o = document.createElement("option");
      o.value = b;
      bankDatalist.appendChild(o);
    });
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    const t = typeSelect.value;
    if (!t) return alert("請選擇資產種類");

    const asset = {
      type: t,
      currency: document.getElementById("currency").value,
      bank: document.getElementById("bank").value,
      note: document.getElementById("note").value
    };

    if (t === "股票") {
      asset.stockCategory = document.getElementById("stock-category").value;
      asset.stockSymbol = document.getElementById("stock-symbol").value;
      asset.shares = parseFloat(document.getElementById("shares").value) || 0;
      asset.cost = parseFloat(document.getElementById("cost").value) || 0;
      asset.price = parseFloat(document.getElementById("price").value) || 0;
    } else if (t === "儲蓄保險") {
      asset.policyName = document.getElementById("policy-name").value;
      asset.policyAmount = parseFloat(document.getElementById("policy-amount").value) || 0;
      asset.policyYears = parseInt(document.getElementById("policy-years").value) || 0;
      asset.policyPremium = parseFloat(document.getElementById("policy-premium").value) || 0;
    } else {
      asset.amount = parseFloat(document.getElementById("amount").value) || 0;
    }

    if (editIndex != null) {
      assets[editIndex] = asset;
      editIndex = null;
    } else {
      assets.push(asset);
    }
    localStorage.setItem("assets", JSON.stringify(assets));
    const b = asset.bank;
    if (b && !bankHistory.includes(b)) {
      bankHistory.push(b);
      localStorage.setItem("banks", JSON.stringify(bankHistory));
    }
    form.reset();
    toggleFields();
    render();
  });

  window.deleteAsset = i => {
    if (confirm("確定要刪除這筆資產嗎？")) {
      assets.splice(i, 1);
      localStorage.setItem("assets", JSON.stringify(assets));
      render();
    }
  };

  window.editAsset = i => {
    const it = assets[i];
    editIndex = i;
    typeSelect.value = it.type;
    document.getElementById("currency").value = it.currency;
    document.getElementById("bank").value = it.bank;
    document.getElementById("note").value = it.note;
    toggleFields();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (it.type === "股票") {
      document.getElementById("stock-category").value = it.stockCategory;
      document.getElementById("stock-symbol").value = it.stockSymbol;
      document.getElementById("shares").value = it.shares;
      document.getElementById("cost").value = it.cost;
      document.getElementById("price").value = it.price;
    } else if (it.type === "儲蓄保險") {
      document.getElementById("policy-name").value = it.policyName;
      document.getElementById("policy-amount").value = it.policyAmount;
      document.getElementById("policy-years").value = it.policyYears;
      document.getElementById("policy-premium").value = it.policyPremium;
    } else {
      document.getElementById("amount").value = it.amount;
    }
  };

  window.convertCurrency = () => {
    const amt = parseFloat(document.getElementById("input-amount").value);
    const rate = parseFloat(document.getElementById("input-rate").value);
    const res = document.getElementById("converted-result");
    if (isNaN(amt) || isNaN(rate)) {
      res.textContent = "請輸入正確金額與匯率";
      return;
    }
    res.textContent = `換算後金額：$${(amt * rate).toLocaleString()}`;
  };

  fetchExchangeRates();
  toggleFields();
  render();
});
