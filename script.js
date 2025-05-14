document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("asset-form");
  const assetList = document.getElementById("asset-list");
  const totalsList = document.getElementById("totals-list");
  const bankInput = document.getElementById("bank");
  const bankDatalist = document.getElementById("bank-list");

  let assets = JSON.parse(localStorage.getItem("assets") || "[]");
  let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]");

  function render() {
    assetList.innerHTML = "";
    totalsList.innerHTML = "";
    let totals = {};

    assets.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.type} - ${item.currency} $${item.amount.toLocaleString()} (${item.bank}) ${item.note ? '- ' + item.note : ''}`;
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

  render();
});
