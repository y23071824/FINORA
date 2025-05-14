
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("asset-form");
  const assetList = document.getElementById("asset-list");
  const summary = document.getElementById("summary");

  let savedAssets = JSON.parse(localStorage.getItem("assets") || "[]");

  function formatCurrency(value) {
    return "$" + Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function saveAssets() {
    localStorage.setItem("assets", JSON.stringify(savedAssets));
  }

  function renderAssets() {
    assetList.innerHTML = "";
    const totals = {};
    const stockProfits = {};

    savedAssets.forEach((asset, index) => {
      const item = document.createElement("div");
      item.className = "asset-item";
      item.innerHTML = `
        <strong>${asset.type}</strong> - ${asset.subtype || ""} - ${asset.currency} - ${asset.bank || ""}<br>
        ${
          asset.type === "股票"
            ? `股數: ${asset.shares}, 成本: ${asset.cost}, 現價: ${asset.price}`
            : asset.type === "儲蓄保險"
            ? `名稱: ${asset.policyName}, 保額: ${asset.coverage}, 年期: ${asset.years}, 年繳: ${asset.premium}`
            : `金額: ${asset.amount}`
        }
        <br>
        <button onclick="editAsset(${index})">編輯</button>
        <button onclick="deleteAsset(${index})">刪除</button>
      `;
      assetList.appendChild(item);

      const currency = asset.currency;
      if (!totals[currency]) {
        totals[currency] = 0;
        stockProfits[currency] = 0;
      }

      if (asset.type === "股票") {
        const cost = parseFloat(asset.cost) || 0;
        const price = parseFloat(asset.price) || 0;
        const shares = parseFloat(asset.shares) || 0;
        const totalCost = cost * shares;
        const totalValue = price * shares;
        const profit = totalValue - totalCost;
        totals[currency] += totalValue;
        stockProfits[currency] += profit;
      } else if (asset.type === "儲蓄保險") {
        // 不計入加總
      } else {
        totals[currency] += parseFloat(asset.amount) || 0;
      }
    });

    // 顯示幣別總和＋盈餘資訊
    summary.innerHTML = "<h3>資產總覽</h3>";
    for (const currency in totals) {
      const total = formatCurrency(totals[currency]);
      const profit = formatCurrency(stockProfits[currency]);
      summary.innerHTML += `<p>${currency}: ${total}（內含股票盈餘：${profit}）</p>`;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const type = document.getElementById("type").value;
    const subtype = document.getElementById("subtype")?.value || "";
    const currency = document.getElementById("currency").value;
    const bank = document.getElementById("bank").value;

    let asset = { type, subtype, currency, bank };

    if (type === "股票") {
      asset.shares = document.getElementById("shares").value;
      asset.cost = document.getElementById("cost").value;
      asset.price = document.getElementById("price").value;
    } else if (type === "儲蓄保險") {
      asset.policyName = document.getElementById("policyName").value;
      asset.coverage = document.getElementById("coverage").value;
      asset.years = document.getElementById("years").value;
      asset.premium = document.getElementById("premium").value;
    } else {
      asset.amount = document.getElementById("amount").value;
    }

    savedAssets.push(asset);
    saveAssets();
    renderAssets();
    form.reset();
  });

  window.editAsset = function(index) {
    const asset = savedAssets[index];
    alert("請手動修改資產（暫不支援自動填入編輯）");
  };

  window.deleteAsset = function(index) {
    if (confirm("確定要刪除這筆資產嗎？")) {
      savedAssets.splice(index, 1);
      saveAssets();
      renderAssets();
    }
  };

  renderAssets();
});
