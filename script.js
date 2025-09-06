// -------------------- Global State --------------------
let currentModule = null; // "purchase" or "sales"
let people = [];
let transactions = [];
let dues = [];

// -------------------- Helpers for Storage --------------------
function loadData() {
  if (!currentModule) return;
  people = JSON.parse(localStorage.getItem(currentModule + "_people")) || [];
  transactions = JSON.parse(localStorage.getItem(currentModule + "_transactions")) || [];
  dues = JSON.parse(localStorage.getItem(currentModule + "_dues")) || [];
}

function saveData() {
  if (!currentModule) return;
  localStorage.setItem(currentModule + "_people", JSON.stringify(people));
  localStorage.setItem(currentModule + "_transactions", JSON.stringify(transactions));
  localStorage.setItem(currentModule + "_dues", JSON.stringify(dues));
}

// -------------------- Navigation --------------------
function openModule(module) {
  currentModule = module;
  document.getElementById("mainDashboard").classList.add("hidden");
  document.getElementById("subDashboard").classList.remove("hidden");
  document.getElementById("moduleTitle").innerText =
    module === "purchase" ? "Credit Purchase" : "Credit Sales";

  loadData();
  refreshUI();
  showTab("add"); // default tab
}

function goBack() {
  document.getElementById("mainDashboard").classList.remove("hidden");
  document.getElementById("subDashboard").classList.add("hidden");
  currentModule = null;
}

// -------------------- Tabs (Vertical) --------------------
function showTab(tabId) {
  // Hide all content
  document.querySelectorAll("#tab-content section").forEach(sec => sec.classList.add("hidden"));

  // Remove active from all vertical buttons
  document.querySelectorAll(".tabs-vertical button").forEach(btn => btn.classList.remove("active"));

  // Show selected tab
  document.getElementById(tabId).classList.remove("hidden");

  // Highlight active button
  document.getElementById("tab-" + tabId).classList.add("active");

  // Refresh chart if analytics tab
  if (tabId === "analytics") refreshChart();
}

// -------------------- UI Elements --------------------
const addPersonForm = document.getElementById("addPersonForm");
const transactionForm = document.getElementById("transactionForm");
const personSelect = document.getElementById("personSelect");
const recordsTable = document.getElementById("recordsTable");
const historyTable = document.getElementById("historyTable");
const deletePersonForm = document.getElementById("deletePersonForm");
const deletePersonSelect = document.getElementById("deletePerson");
const creditorSelect = document.getElementById("creditorSelect");
const dueTable = document.getElementById("dueTable");

// -------------------- History --------------------
function refreshHistory(filterName = null) {
  historyTable.innerHTML = "";
  transactions.forEach(t => {
    if (!filterName || t.name === filterName) {
      let row = `<tr>
        <td>${t.date}</td>
        <td>${t.name}</td>
        <td>${t.type === "credit" ? "Credit" : "Payment"}</td>
        <td>₹${t.amount}</td>
      </tr>`;
      historyTable.innerHTML += row;
    }
  });
}

// -------------------- Chart --------------------
function refreshChart() {
  const ctx = document.getElementById("balanceChart").getContext("2d");
  if (window.balanceChart instanceof Chart) {
    window.balanceChart.destroy();
  }

  const labels = people;
  const balances = people.map(p => {
    let credit = 0, payment = 0;
    transactions.forEach(t => {
      if (t.name === p) {
        if (t.type === "credit") credit += t.amount;
        else payment += t.amount;
      }
    });
    return credit - payment;
  });

  window.balanceChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Balance (₹)",
        data: balances,
        backgroundColor: balances.map(b =>
          b >= 0 ? "rgba(0, 127, 255, 0.6)" : "rgba(255, 99, 132, 0.6)"
        )
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

// -------------------- Refresh All UI --------------------
function refreshUI() {
  const searchTerm = document.getElementById("searchInput")?.value?.toLowerCase() || "";

  // Clear dropdowns
  personSelect.innerHTML = "";
  deletePersonSelect.innerHTML = "";
  creditorSelect.innerHTML = "";

  // Filter people
  let filteredPeople = people.filter(p => p.toLowerCase().includes(searchTerm));

  // Populate dropdowns
  people.forEach(p => {
    personSelect.appendChild(new Option(p, p));
    deletePersonSelect.appendChild(new Option(p, p));
    creditorSelect.appendChild(new Option(p, p));
  });

  // Update summary table
  recordsTable.innerHTML = "";
  filteredPeople.forEach(p => {
    let credit = 0, payment = 0;
    transactions.forEach(t => {
      if (t.name === p) {
        if (t.type === "credit") credit += t.amount;
        else payment += t.amount;
      }
    });
    let balance = credit - payment;

    let row = document.createElement("tr");
    row.innerHTML = `
      <td class="clickable">${p}</td>
      <td>₹${credit}</td>
      <td>₹${payment}</td>
      <td>${balance >= 0 ? "₹" + balance : "-₹" + Math.abs(balance)}</td>
    `;
    row.querySelector(".clickable").addEventListener("click", () => {
      refreshHistory(p);
    });
    recordsTable.appendChild(row);
  });

  refreshHistory();
  renderDues();

  // Search input event listener
  document.getElementById("searchInput").addEventListener("input", refreshUI);
}

// -------------------- Add Person --------------------
addPersonForm.addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("personName").value.trim();
  if (name && !people.includes(name)) {
    people.push(name);
    saveData();
    refreshUI();
  }
  addPersonForm.reset();
});

// -------------------- Add Transaction --------------------
transactionForm.addEventListener("submit", e => {
  e.preventDefault();
  const person = personSelect.value;
  const date = document.getElementById("date").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;

  if (person && date && amount > 0) {
    transactions.push({ name: person, date, amount, type });
    saveData();
    refreshUI();
  }
  transactionForm.reset();
});

// -------------------- Export CSV --------------------
document.getElementById("exportCSV").addEventListener("click", () => {
  if (transactions.length === 0) {
    alert("No transactions to export.");
    return;
  }

  let csv = "Date,Name,Type,Amount\n";
  transactions.forEach(t => {
    csv += `${t.date},${t.name},${t.type},${t.amount}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = currentModule + "_transactions.csv";
  a.click();
});

// -------------------- Dues --------------------
document.getElementById("dueForm").addEventListener("submit", e => {
  e.preventDefault();
  let name = creditorSelect.value;
  let contact = document.getElementById("contact").value;
  let date = document.getElementById("dueDate").value;

  if (!name || !date) {
    alert("Please select creditor and due date!");
    return;
  }

  dues.push({ name, contact, date });
  saveData();
  renderDues();
  e.target.reset();
});

function renderDues(list = dues) {
  dueTable.innerHTML = "";
  list.forEach(d => {
    let row = `<tr>
      <td>${d.name}</td>
      <td>${d.contact || "-"}</td>
      <td>${d.date}</td>
    </tr>`;
    dueTable.innerHTML += row;
  });
}

// -------------------- Delete Person --------------------
deletePersonForm.addEventListener("submit", e => {
  e.preventDefault();
  const person = deletePersonSelect.value;
  if (person) {
    if (!confirm(`Delete ${person} and all their records?`)) return;

    people = people.filter(p => p !== person);
    transactions = transactions.filter(t => t.name !== person);
    dues = dues.filter(d => d.name !== person);

    saveData();
    refreshUI();
  }
});

// -------------------- Init --------------------
if (currentModule) loadData();