
let totalAsset = 0;
function addAsset() {
  const name = document.getElementById("asset-name").value;
  const value = parseFloat(document.getElementById("asset-value").value);
  if (!name || isNaN(value)) return alert("請填入正確資料");
  totalAsset += value;
  const li = document.createElement("li");
  li.textContent = `${name}：${value} 元`;
  document.getElementById("asset-list").appendChild(li);
  document.getElementById("total-asset").textContent = totalAsset.toLocaleString();
  document.getElementById("retirement-asset").value = totalAsset;
}

function calculateYears() {
  const asset = parseFloat(document.getElementById("retirement-asset").value);
  const withdraw = parseFloat(document.getElementById("withdraw-amount").value);
  if (isNaN(asset) || isNaN(withdraw) || withdraw <= 0) return alert("請輸入有效數值");
  const years = Math.floor(asset / withdraw);
  document.getElementById("retirement-result").textContent = `預估可支撐約 ${years} 年`;
}
