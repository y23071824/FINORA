
function updateFormByType() {
  const type = document.getElementById('asset-type').value;
  document.getElementById('general-fields').style.display = (type === '股票') ? 'none' : 'block';
  document.getElementById('stock-fields').style.display = (type === '股票') ? 'block' : 'none';
  updateExchangeVisibility();
}

function updateExchangeVisibility() {
  const currency = document.getElementById('asset-currency').value;
  document.getElementById('exchange-group').style.display = (currency !== 'TWD') ? 'block' : 'none';
}

function saveAsset(event) {
  event.preventDefault();
  const type = document.getElementById('asset-type').value;
  const currency = document.getElementById('asset-currency').value;
  const rate = parseFloat(document.getElementById('asset-rate').value || 1);
  const bank = document.getElementById('asset-bank').value;
  const note = document.getElementById('asset-note').value;

  let asset = { type, currency, rate, bank, note };

  if (type === '股票') {
    const name = document.getElementById('stock-name').value;
    const shares = parseFloat(document.getElementById('stock-shares').value);
    const cost = parseFloat(document.getElementById('stock-cost').value);
    const current = parseFloat(document.getElementById('stock-current').value);
    const totalCost = shares * cost;
    const totalValue = shares * current;
    const gain = totalValue - totalCost;
    asset = { ...asset, name, shares, cost, current, totalCost, totalValue, gain };
  } else {
    asset.amount = parseFloat(document.getElementById('asset-amount').value);
  }

  const assetLog = JSON.parse(localStorage.getItem('assetLog') || '[]');
  assetLog.push(asset);
  localStorage.setItem('assetLog', JSON.stringify(assetLog));
  document.getElementById('asset-form').reset();
  updateFormByType();
  displayAssets();
}

function displayAssets() {
  const entries = JSON.parse(localStorage.getItem('assetLog') || '[]');
  const container = document.getElementById('asset-list');
  container.innerHTML = '<h3>我的資產紀錄</h3>';
  entries.forEach((entry, index) => {
    let html = '';
    if (entry.type === '股票') {
      html = `<strong>${entry.name}</strong>（股票）<br>
        股數：${entry.shares}，成本單價：$${entry.cost}，現價：$${entry.current}<br>
        成本總額：$${entry.totalCost.toFixed(2)}，現值：$${entry.totalValue.toFixed(2)}，獲利：$${entry.gain.toFixed(2)}<br>
        幣別：${entry.currency}，台幣換算：$${(entry.totalValue * entry.rate).toFixed(2)}<br>
        銀行：${entry.bank || '無'}，備註：${entry.note || '無'}`;
    } else {
      const converted = (entry.currency !== 'TWD') ? ` ≈ 台幣 $${(entry.amount * entry.rate).toFixed(2)}` : '';
      html = `<strong>${entry.type}</strong> - ${entry.currency} $${entry.amount}${converted}<br>
        銀行：${entry.bank || '無'}，備註：${entry.note || '無'}`;
    }
    container.innerHTML += `<div class="asset-entry">${html}</div>`;
  });
}

window.onload = function () {
  updateFormByType();
  displayAssets();
}
