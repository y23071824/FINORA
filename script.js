
function switchTab(id) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function saveAsset(event) {
  event.preventDefault();
  const name = document.getElementById('asset-name').value;
  const type = document.getElementById('asset-type').value;
  const amount = parseFloat(document.getElementById('asset-amount').value);
  const bank = document.getElementById('asset-bank').value;
  const note = document.getElementById('asset-note').value;

  const assetLog = JSON.parse(localStorage.getItem('assetLog') || '[]');
  assetLog.push({ name, type, amount, bank, note });
  localStorage.setItem('assetLog', JSON.stringify(assetLog));
  document.getElementById('asset-form').reset();
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
    container.innerHTML += `
      <div class="asset-entry">
        <strong>${entry.name}</strong>（${entry.type}） - $${entry.amount}<br>
        銀行：${entry.bank || '無'}，備註：${entry.note || '無'}
        <button onclick="deleteAsset(${index})">刪除</button>
      </div>
    `;
  });
}

window.onload = displayAssets;
