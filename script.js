
function switchTab(id) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function updateExchangeVisibility() {
  const type = document.getElementById('asset-type').value;
  const currency = document.getElementById('asset-currency').value;
  const exchangeGroup = document.getElementById('exchange-group');
  const shouldShow = (currency !== 'TWD') && (type === '現金' || type === '定存');
  exchangeGroup.style.display = shouldShow ? 'block' : 'none';
}

function saveAsset(event) {
  event.preventDefault();
  const type = document.getElementById('asset-type').value;
  const amount = parseFloat(document.getElementById('asset-amount').value);
  const currency = document.getElementById('asset-currency').value;
  const rate = parseFloat(document.getElementById('asset-rate').value || 1);
  const bank = document.getElementById('asset-bank').value;
  const note = document.getElementById('asset-note').value;

  const assetLog = JSON.parse(localStorage.getItem('assetLog') || '[]');
  assetLog.push({ type, amount, currency, rate, bank, note });
  localStorage.setItem('assetLog', JSON.stringify(assetLog));
  document.getElementById('asset-form').reset();
  updateExchangeVisibility();
  displayAssets();
}

function deleteAsset(index) {
  const assetLog = JSON.parse(localStorage.getItem('assetLog') || '[]');
  assetLog.splice(index, 1);
  localStorage.setItem('assetLog', JSON.stringify(assetLog));
  displayAssets();
}

function displayAssets() {
  const entries = JSON.parse(localStorage.getItem('assetLog') || '[]');
  const container = document.getElementById('asset-list');
  container.innerHTML = '<h3>我的資產紀錄</h3>';
  entries.forEach((entry, index) => {
    const converted = (entry.currency !== 'TWD') ? ` ≈ 台幣 $${(entry.amount * entry.rate).toFixed(2)}` : '';
    container.innerHTML += `
      <div class="asset-entry">
        <strong>${entry.type}</strong> - ${entry.currency} $${entry.amount}${converted}<br>
        銀行：${entry.bank || '無'}，備註：${entry.note || '無'}
        <button onclick="deleteAsset(${index})">刪除</button>
      </div>
    `;
  });
}

window.onload = function() {
  updateExchangeVisibility();
  displayAssets();
}
