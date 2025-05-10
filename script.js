
let editIndex = null;

function saveAsset(e) {
  e.preventDefault();
  const entry = {
    type: document.getElementById('type').value,
    amount: parseFloat(document.getElementById('amount').value),
    currency: document.getElementById('currency').value,
    rate: parseFloat(document.getElementById('rate').value || 1),
    bank: document.getElementById('bank').value,
    note: document.getElementById('note').value
  };

  let data = JSON.parse(localStorage.getItem('assets') || '[]');
  if (editIndex !== null) {
    data[editIndex] = entry;
    editIndex = null;
  } else {
    data.push(entry);
  }
  localStorage.setItem('assets', JSON.stringify(data));

  let banks = JSON.parse(localStorage.getItem('banks') || '[]');
  if (entry.bank && !banks.includes(entry.bank)) {
    banks.push(entry.bank);
    localStorage.setItem('banks', JSON.stringify(banks));
  }

  document.getElementById('asset-form').reset();
  render();
}

function render() {
  const assets = JSON.parse(localStorage.getItem('assets') || '[]');
  const list = document.getElementById('asset-list');
  const banks = JSON.parse(localStorage.getItem('banks') || '[]');
  document.getElementById('bank-list').innerHTML = banks.map(b => `<option value="${b}">`).join('');

  list.innerHTML = '<h3>資產紀錄</h3>';
  let totalTWD = 0, USD = 0, OTHER = 0;
  assets.forEach((a, i) => {
    const converted = a.amount * a.rate;
    totalTWD += converted;
    if (a.currency === 'USD') USD += a.amount;
    else if (a.currency === 'OTHER') OTHER += a.amount;
    list.innerHTML += `
      <div class="asset-entry">
        <strong>${a.type}</strong> - ${a.currency} $${a.amount} ≈ 台幣 $${converted.toFixed(2)}<br>
        銀行：${a.bank || '無'}，備註：${a.note || '無'}<br>
        <button onclick="editAsset(${i})">編輯</button>
        <button onclick="deleteAsset(${i})">刪除</button>
      </div>`;
  });

  document.getElementById('summary').innerHTML = `
    <h3>彙總</h3>
    台幣總額：約 $${totalTWD.toFixed(2)}<br>
    美金合計：$${USD.toFixed(2)}<br>
    其他幣別：$${OTHER.toFixed(2)}
  `;
}

function editAsset(i) {
  const a = JSON.parse(localStorage.getItem('assets'))[i];
  document.getElementById('type').value = a.type;
  document.getElementById('amount').value = a.amount;
  document.getElementById('currency').value = a.currency;
  document.getElementById('rate').value = a.rate;
  document.getElementById('bank').value = a.bank;
  document.getElementById('note').value = a.note;
  editIndex = i;
}

function deleteAsset(i) {
  let data = JSON.parse(localStorage.getItem('assets'));
  data.splice(i, 1);
  localStorage.setItem('assets', JSON.stringify(data));
  render();
}

window.onload = render;
