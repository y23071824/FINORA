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

    let totals = {};
    let profits = {};

    assets.forEach((item, index) => {
      let extra = "";
      let currency = item.currency;
      let amount = 0;

      if (item.type === "股票") {
        const cost = item.shares * item.cost;
        const value = item.shares * item.price;
        const profit = value - cost;
        amount = cost;
        profits[currency] = (profits[currency] || 0) + profit;
        extra = `
          <br>股票類型：${item.stockCategory}
          <br>股數：${item.shares}, 成本：$${item.cost}, 現價：$${item.price}
          <br>總成本：$${cost.toFixed(2)}, 市值：$${value.toFixed(2)}, 盈餘：$${profit.toFixed(2)}`;
      } else if (item.type === "儲蓄保險") {
        amount = item.policyAmount;
        extra = `
          <br>保單名稱：${item.policyName}
          <br>保額：$${item.policyAmount}, 年期：${item.policyYears} 年, 年繳保費：$${item.policyPremium}`;
      } else {
        amount = item.amount !== undefined && item.amount !== null ? parseFloat(item.amount) : 0;
        extra = `<br>金額：$${amount.toLocaleString()}`; // ✅ 顯示金額
      }

      totals[currency] = (totals[currency] || 0) + amount;

      const li = document.createElement("li");
      li.innerHTML = `
        ${item.type} - ${item.currency} (${item.bank}) ${item.note ? '- ' + item.note : ''}
        ${extra}
        <button onclick="editAsset(${index})">編輯</button>
        <button onclick="deleteAsset(${index})">刪除</button>
      `;
      assetList.appendChild(li);
    });

    for (const ccy in totals) {
      const li = document.createElement("li");
      li.textContent = `${ccy}: $${totals[ccy].toLocaleString()}`;
      totalsList.appendChild(li);
    }

    for (const ccy in profits) {
      const li = document.createElement("li");
      li.textContent = `${ccy} 股票總盈餘：$${profits[ccy].toFixed(2)}`;
      profitList.appendChild(li);
    }

    bankDatalist.innerHTML = "";
    bankHistory.forEach(bank => {
      const opt = document.createElement("option");
      opt.value = bank;
      bankDatalist.appendChild(opt);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = document.getElementById("type").value;
    if (!type) return alert("請選擇資產種類");

    const asset = {
      type,
      currency: document.getElementById("currency").value,
      bank: document.getElementById("bank").value,
      note: document.getElementById("note").value
    };

    if (type === "股票") {
      asset.stockCategory = document.getElementById("stock-category").value;
      asset.shares = parseFloat(document.getElementById("shares").value) || 0;
      asset.cost = parseFloat(document.getElementById("cost").value) || 0;
      asset.price = parseFloat(document.getElementById("price").value) || 0;
    } else if (type === "儲蓄保險") {
      asset.policyName = document.getElementById("policy-name").value;
      asset.policyAmount = parseFloat(document.getElementById("policy-amount").value) || 0;
      asset.policyYears = parseInt(document.getElementById("policy-years").value) || 0;
      asset.policyPremium = parseFloat(document.getElementById("policy-premium").value) || 0;
    } else {
      const amtInput = document.getElementById("amount");
      asset.amount = amtInput && amtInput.value !== "" ? parseFloat(amtInput.value) : 0;
    }

    if (editIndex !== null) {
      assets[editIndex] = asset;
      editIndex = null;
    } else {
      assets.push(asset);
    }

    localStorage.setItem("assets", JSON.stringify(assets));

    const bank = asset.bank;
    if (bank && !bankHistory.includes(bank)) {
      bankHistory.push(bank);
      localStorage.setItem("banks", JSON.stringify(bankHistory));
    }

    form.reset();
    toggleFields();
    render();
  });

  window.deleteAsset = (index) => {
    if (confirm("確定要刪除這筆資產嗎？")) {
      assets.splice(index, 1);
      localStorage.setItem("assets", JSON.stringify(assets));
      render();
    }
  };

  window.editAsset = (index) => {
    const item = assets[index];
    editIndex = index;
    document.getElementById("type").value = item.type;
    document.getElementById("currency").value = item.currency;
    document.getElementById("bank").value = item.bank;
    document.getElementById("note").value = item.note;
    toggleFields();

    if (item.type === "股票") {
      document.getElementById("stock-category").value = item.stockCategory;
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
  };

  window.convertCurrency = () => {
    const amt = parseFloat(document.getElementById("input-amount").value);
    const rate = parseFloat(document.getElementById("input-rate").value);
    const result = document.getElementById("converted-result");
    if (isNaN(amt) || isNaN(rate)) {
      result.textContent = "請輸入正確金額與匯率";
      return;
    }
    result.textContent = `換算後金額：$${(amt * rate).toLocaleString()}`;
  };

  toggleFields();
  render();
});
