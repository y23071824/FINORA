document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("asset-form");
  const typeSelect = document.getElementById("type");
  const stockFields = document.getElementById("stock-fields");
  const assetList = document.getElementById("asset-list");
  const totalsList = document.getElementById("totals-list");
  const bankDatalist = document.getElementById("bank-list");

  let assets = JSON.parse(localStorage.getItem("assets") || "[]");
  let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");

  typeSelect.addEventListener("change", () => {
    stockFields.style.display = typeSelect.value === "股票" ? "block" : "none";
  });

  function render() {
    assetList.innerHTML = "";
    totalsList.innerHTML = "";
    let totals = {};

    assets.forEach((item, index) => {
      let extra = "";
      if (item.type === "股票") {
        const marketValue = item.shares * item.price;
        const costValue = item.shares * item.cost;
        extra = `<br>股數：${item.shares}, 張數：${item.lots}, 成本單價：$${item.cost}, 現價：$${item.price}
        <br>總成本：$${costValue.toFixed(2)}, 市值：$${marketValue.toFixed(2)}`;
      }

      const li = document.createElement("li");
      li.innerHTML = `
        ${item.type} - ${item.currency} $${item.amount.toLocaleString()} (${item.bank}) ${item.note ? '- ' + item.note : ''}
        ${extra}
        <button onclick="editAsset(${index})">編輯</button>
        <button onclick="deleteAsset(${index})">刪除</button>
      `;
      assetList.appendChild(li);
      totals[item.currency] = (totals[item.currency] || 0) + Number(item.amount);
    });

    for (const currency in totals) {
      const li = document.createElement("li");
      li.textContent = `${currency}: $${totals[currency].toLocaleString()}`;
      totalsList.appendChild(li);
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
    const asset = {
      type: document.getElementById("type").value,
      amount: parseFloat(document.getElementById("amount").value),
      currency: document.getElementById("currency").value,
      bank: document.getElementById("bank").value,
      note: document.getElementById("note").value
    };

    if (asset.type === "股票") {
      asset.shares = parseFloat(document.getElementById("shares").value) || 0;
      asset.lots = parseFloat(document.getElementById("lots").value) || 0;
      asset.cost = parseFloat(document.getElementById("cost").value) || 0;
      asset.price = parseFloat(document.getElementById("price").value) || 0;
    }

    assets.push(asset);
    localStorage.setItem("assets", JSON.stringify(assets));

    const bank = asset.bank;
    if (bank && !bankHistory.includes(bank)) {
      bankHistory.push(bank);
      localStorage.setItem("banks", JSON.stringify(bankHistory));
    }

    form.reset();
    stockFields.style.display = "none";
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
    document.getElementById("type").value = item.type;
    document.getElementById("amount").value = item.amount;
    document.getElementById("currency").value = item.currency;
    document.getElementById("bank").value = item.bank;
    document.getElementById("note").value = item.note;
    if (item.type === "股票") {
      stockFields.style.display = "block";
      document.getElementById("shares").value = item.shares;
      document.getElementById("lots").value = item.lots;
      document.getElementById("cost").value = item.cost;
      document.getElementById("price").value = item.price;
    } else {
      stockFields.style.display = "none";
    }
    assets.splice(index, 1);
    localStorage.setItem("assets", JSON.stringify(assets));
    render();
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

  render();
});
