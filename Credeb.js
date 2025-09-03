let people = JSON.parse(localStorage.getItem("people")) || [];
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

const addPersonForm = document.getElementById("addPersonForm");
const transactionForm = document.getElementById("transactionForm");
const personSelect = document.getElementById("personSelect");
const recordsTable = document.getElementById("recordsTable");

// Save to localStorage
function saveData() {
  localStorage.setItem("people", JSON.stringify(people));
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// Refresh dropdown and table
function refreshUI() {
  // Update dropdown
  personSelect.innerHTML = "";
  people.forEach(p => {
    let option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    personSelect.appendChild(option);
  });

  // Update table
  recordsTable.innerHTML = "";
  people.forEach(p => {
    let credit = 0, payment = 0;
    transactions.forEach(t => {
      if (t.name === p) {
        if (t.type === "credit") credit += t.amount;
        else payment += t.amount;
      }
    });
    let balance = credit - payment;

    let row = `<tr>
      <td>${p}</td>
      <td>₹${credit}</td>
      <td>₹${payment}</td>
      <td>${balance >= 0 ? "₹" + balance : "-₹" + Math.abs(balance)}</td>
    </tr>`;
    recordsTable.innerHTML += row;
  });
}

// Add person
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

// Add transaction
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

refreshUI();
