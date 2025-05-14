document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("asset-form");
  const assetList = document.getElementById("asset-list");
  const totalsList = document.getElementById("totals-list");
  const bankDatalist = document.getElementById("bank-list");

  let assets = JSON.parse(localStorage.getItem("assets") || "[]");
  let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");

  function render() {
    assetList.innerHTML = "";
    totalsList.innerHTML = "";
    let totals = {};

    assets.forEach((item, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        ${item.type} - ${item.currency} $${item.amount.toLocaleString()} (${item.bank}) ${item.note ? '- ' + item.note : ''}
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
    const type = document.getElementById("type").value;
    const amount = parseFloat(document.getElementById("amount").value);
    const currency = document.getElementById("currency").value;
    const bank = document.getElementById("bank").value;
    const note = document.getElementById("note").value;

    assets.push({ type, amount, currency, bank, note });
    localStorage.setItem("assets", JSON.stringify(assets));

    if (bank && !bankHistory.includes(bank)) {
      bankHistory.push(bank);
      localStorage.setItem("banks", JSON.stringify(bankHistory));
    }

    form.reset();
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
