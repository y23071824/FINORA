// script.js

const apikey = "de909496c6754a89bc33db0306c2def8"; // Twelve Data API 金鑰

const form = document.getElementById("asset-form"); const typeSelect = document.getElementById("type"); const stockFields = document.getElementById("stock-fields"); const insuranceFields = document.getElementById("insurance-fields"); const amountField = document.getElementById("amount-field"); const assetList = document.getElementById("asset-list"); const totalsList = document.getElementById("totals-list"); const bankDatalist = document.getElementById("bank-list");

let assets = JSON.parse(localStorage.getItem("assets") || "[]"); let bankHistory = JSON.parse(localStorage.getItem("banks") || "[]"); let exchangeRates = {}; let editIndex = null;

function toggleFields() { const type = typeSelect.value; stockFields.style.display = type === "股票" ? "block" : "none"; insuranceFields.style.display = type === "儲蓄保險" ? "block" : "none"; amountField.style.display = type !== "股票" && type !== "儲蓄保險" ? "block" : "none"; }

typeSelect.addEventListener("change", toggleFields);

async function fetchExchangeRates() { try { const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=TWD,JPY,EUR"); const data = await res.json(); exchangeRates = data.rates; localStorage.setItem("exchangeRates", JSON.stringify(exchangeRates)); } catch (e) { console.error("匯率載入失敗", e); } }

async function fetchStockPrice(symbol, category) { try { if (category === "台股") { const res = await fetch(https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}.TW); const data = await res.json(); return data.quoteResponse.result[0]?.regularMarketPrice || null; } else { const res = await fetch(https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apikey}); const data = await res.json(); return data.price ? parseFloat(data.price) : null; } } catch (e) { console.error("股價查詢失敗", e); return null; } }

document.getElementById("stock-symbol")?.addEventListener("blur", async () => { const symbolInput = document.getElementById("stock-symbol").value.trim().toUpperCase(); const category = document.getElementById("stock-category").value; const symbol = category === "台股" ? symbolInput : symbolInput; const price = await fetchStockPrice(symbol, category); if (price != null) { document.getElementById("price").value = price; } else { alert("查無此股票代碼或查價失敗，請重新確認。"); } });

document.getElementById("currency")?.addEventListener("change", () => { const currency = document.getElementById("currency").value; const rates = JSON.parse(localStorage.getItem("exchangeRates") || "{}"); if (["USD", "JPY", "EUR"].includes(currency)) { alert(目前 ${currency} 對 TWD 匯率：約 ${rates[currency] || "查詢中"}); } });

function render() { assetList.innerHTML = ""; totalsList.innerHTML = "";

let totals = {}; let profits = {};

assets.forEach((item, index) => { let currency = item.currency; let amount = 0; let profit = 0; let extra = "";

if (item.type === "股票") {
  const cost = item.shares * item.cost;
  const value = item.shares * item.price;
  profit = value - cost;
  amount = cost;
  profits[currency] = (profits[currency] || 0) + profit;
  extra = `股票代碼：${item.stockSymbol}<br>類型：${item.stockCategory}<br>股數：${item.shares}, 成本：$${item.cost}, 現價：$${item.price}<br>成本總額：$${cost.toFixed(2)}, 盈餘：$${profit.toFixed(2)}`;
} else if (item.type === "儲蓄保險") {
  amount = item.policyAmount;
  extra = `保單：${item.policyName}<br>保額：$${item.policyAmount}, 年期：${item.policyYears}, 年繳保費：$${item.policyPremium}`;
} else {
  amount = parseFloat(item.amount) || 0;
  extra = `金額：$${amount.toLocaleString()}`;
}

totals[currency] = (totals[currency] || 0) + amount;

const li = document.createElement("li");
li.innerHTML = `${item.type} - ${currency} (${item.bank}) ${item.note || ""}<br>${extra}<br><button onclick="editAsset(${index})">編輯</button> <button onclick="deleteAsset(${index})">刪除</button>`;
assetList.appendChild(li);

});

for (const ccy in totals) { const total = totals[ccy]; const profit = profits[ccy] || 0; const rate = ccy === "TWD" ? 1 : exchangeRates[ccy] || 0; const totalTWD = ((total + profit) * rate).toFixed(2); const li = document.createElement("li"); li.textContent = ${ccy} 資產含盈餘：$${(total + profit).toLocaleString()} → 約 NT$${Number(totalTWD).toLocaleString()}; totalsList.appendChild(li); }

bankDatalist.innerHTML = ""; bankHistory.forEach(bank => { const opt = document.createElement("option"); opt.value = bank; bankDatalist.appendChild(opt); }); }

form.addEventListener("submit", e => { e.preventDefault(); const type = document.getElementById("type").value; if (!type) return alert("請選擇資產種類");

const asset = { type, currency: document.getElementById("currency").value, bank: document.getElementById("bank").value, note: document.getElementById("note").value };

if (type === "股票") { asset.stockCategory = document.getElementById("stock-category").value; asset.stockSymbol = document.getElementById("stock-symbol").value; asset.shares = parseFloat(document.getElementById("shares").value) || 0; asset.cost = parseFloat(document.getElementById("cost").value) || 0; asset.price = parseFloat(document.getElementById("price").value) || 0; } else if (type === "儲蓄保險") { asset.policyName = document.getElementById("policy-name").value; asset.policyAmount = parseFloat(document.getElementById("policy-amount").value) || 0; asset.policyYears = parseInt(document.getElementById("policy-years").value) || 0; asset.policyPremium = parseFloat(document.getElementById("policy-premium").value) || 0; } else { asset.amount = parseFloat(document.getElementById("amount").value) || 0; }

if (editIndex !== null) { assets[editIndex] = asset; editIndex = null; } else { assets.push(asset); }

localStorage.setItem("assets", JSON.stringify(assets));

const bank = asset.bank; if (bank && !bankHistory.includes(bank)) { bankHistory.push(bank); localStorage.setItem("banks", JSON.stringify(bankHistory)); }

form.reset(); toggleFields(); render(); });

window.deleteAsset = index => { if (confirm("確定要刪除？")) { assets.splice(index, 1); localStorage.setItem("assets", JSON.stringify(assets)); render(); } };

window.editAsset = index => { const item = assets[index]; editIndex = index; document.getElementById("type").value = item.type; document.getElementById("currency").value = item.currency; document.getElementById("bank").value = item.bank; document.getElementById("note").value = item.note; toggleFields(); window.scrollTo({ top: 0, behavior: "smooth" });

if (item.type === "股票") { document.getElementById("stock-category").value = item.stockCategory; document.getElementById("stock-symbol").value = item.stockSymbol; document.getElementById("shares").value = item.shares; document.getElementById("cost").value = item.cost; document.getElementById("price").value = item.price; } else if (item.type === "儲蓄保險") { document.getElementById("policy-name").value = item.policyName; document.getElementById("policy-amount").value = item.policyAmount; document.getElementById("policy-years").value = item.policyYears; document.getElementById("policy-premium").value = item.policyPremium; } else { document.getElementById("amount").value = item.amount; } };

window.convertCurrency = () => { const amt = parseFloat(document.getElementById("input-amount").value); const rate = parseFloat(document.getElementById("input-rate").value); const result = document.getElementById("converted-result"); if (isNaN(amt) || isNaN(rate)) { result.textContent = "請輸入正確金額與匯率"; return; } result.textContent = 換算後金額：$${(amt * rate).toLocaleString()}; };

fetchExchangeRates(); toggleFields(); render();

