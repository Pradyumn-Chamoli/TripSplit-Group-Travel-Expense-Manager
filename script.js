"use strict";
const KEY = "tripsplit-mini-v1";
const CATEGORIES = {
  Food: { icon: "🍜", color: "#7960e9" },
  Transport: { icon: "🚕", color: "#50a8e9" },
  Stay: { icon: "🏨", color: "#f3ac61" },
  Activities: { icon: "🎟️", color: "#49bc96" },
  Shopping: { icon: "🛍️", color: "#ee7eab" },
  Other: { icon: "🧾", color: "#9a9bac" },
};
const $ = (id) => document.getElementById(id);
const money = (n) =>
  "₹" +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const fresh = () => ({ trip: null, expenses: [] });
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (
      raw &&
      Array.isArray(raw.expenses) &&
      (!raw.trip ||
        (typeof raw.trip.name === "string" && Array.isArray(raw.trip.members)))
    )
      return raw;
  } catch {}
  return fresh();
}
let state = load(),
  chart = null,
  currentSection = "dashboard",
  editing = false,
  toastTimer;
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    toast("Could not save. Browser storage may be full.");
  }
}
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function total() {
  return round(state.expenses.reduce((s, e) => s + e.amount, 0));
}
function formatDate(d) {
  const dt = new Date(d + "T12:00:00");
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}
function balances() {
  const b = Object.fromEntries((state.trip?.members || []).map((m) => [m, 0]));
  if (!state.trip) return b;
  for (const e of state.expenses) {
    if (!(e.payer in b)) continue;
    const cents = Math.round(e.amount * 100),
      base = Math.floor(cents / state.trip.members.length),
      remainder = cents % state.trip.members.length;
    b[e.payer] += cents;
    state.trip.members.forEach((m, i) => {
      b[m] -= base + (i < remainder ? 1 : 0);
    });
  }
  return b;
}
function settlements() {
  const b = balances(),
    debtors = [],
    creditors = [];
  for (const [name, cents] of Object.entries(b)) {
    if (cents < 0) debtors.push({ name, cents: -cents });
    if (cents > 0) creditors.push({ name, cents });
  }
  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);
  const out = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const cents = Math.min(debtors[i].cents, creditors[j].cents);
    if (cents > 0)
      out.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: cents / 100,
      });
    debtors[i].cents -= cents;
    creditors[j].cents -= cents;
    if (!debtors[i].cents) i++;
    if (!creditors[j].cents) j++;
  }
  return out;
}
function expenseRow(e, allowDelete = false) {
  return `<div class="expense-row"><div class="expense-icon">${CATEGORIES[e.category]?.icon || "🧾"}</div><div class="expense-desc"><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(e.category)} · Paid by ${escapeHtml(e.payer)} · ${escapeHtml(formatDate(e.date))}</small></div><span class="expense-amount">${money(e.amount)}</span>${allowDelete ? `<button class="delete-btn" data-delete="${escapeHtml(e.id)}" aria-label="Delete ${escapeHtml(e.title)}">✕</button>` : ""}</div>`;
}
function render() {
  const trip = state.trip,
    spent = total(),
    budget = trip?.budget || 0,
    remaining = round(budget - spent);
  $("tripName").textContent = trip?.name || "No trip yet";
  $("tripMeta").textContent = trip
    ? `${trip.destination} · ${trip.members.length} members · ${state.expenses.length} expenses`
    : "Create your first trip to get started";
  $("totalSpent").textContent = money(spent);
  $("tripBudget").textContent = money(budget);
  $("budgetRemaining").textContent = money(remaining);
  $("budgetRemaining").style.color = remaining < 0 ? "#dc6472" : "";
  $("memberCount").textContent = trip?.members.length || 0;
  $("budgetNote").textContent =
    remaining < 0
      ? "Over budget — review spending"
      : "Available for upcoming expenses";
  const pct = budget ? Math.round((spent / budget) * 100) : 0;
  $("budgetPercent").textContent = pct + "%";
  $("budgetRing").style.background =
    `conic-gradient(${pct > 100 ? "#e67c8a" : "#795dea"} ${Math.min(100, pct)}%,#efedf9 0%)`;
  $("budgetProgress").style.width = Math.min(100, pct) + "%";
  $("budgetProgress").style.background = pct > 100 ? "#e67c8a" : "#795dea";
  $("budgetSpentSmall").textContent = money(spent);
  $("budgetTotalSmall").textContent = money(budget);
  $("budgetMessage").textContent = !trip
    ? "Create a trip to start tracking."
    : pct > 100
      ? "You have exceeded your trip budget."
      : pct >= 80
        ? "Heads up! You have used over 80% of your budget."
        : "Looking good! Keep your trip spending on track.";
  const ordered = [...state.expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );
  $("recentExpenses").innerHTML = ordered.length
    ? ordered
        .slice(0, 5)
        .map((e) => expenseRow(e))
        .join("")
    : '<div class="empty">✦ No expenses yet. Add your first one to get started!</div>';
  const filtered = ordered.filter(
    (e) =>
      $("categoryFilter").value === "All" ||
      e.category === $("categoryFilter").value,
  );
  $("allExpenses").innerHTML = filtered.length
    ? filtered.map((e) => expenseRow(e, true)).join("")
    : '<div class="empty">No expenses found for this category.</div>';
  const b = balances();
  $("memberBalances").innerHTML = trip?.members.length
    ? trip.members
        .map(
          (m) =>
            `<div class="balance-row"><span class="balance-name"><span class="member-avatar">${escapeHtml(m[0].toUpperCase())}</span>${escapeHtml(m)}</span><strong class="${b[m] > 0 ? "positive" : b[m] < 0 ? "negative" : "zero"}">${b[m] > 0 ? "+" : b[m] < 0 ? "-" : ""}${money(Math.abs(b[m]) / 100)}</strong></div>`,
        )
        .join("")
    : '<div class="empty">Create a trip to see balances.</div>';
  const pay = settlements();
  $("settlementList").innerHTML = pay.length
    ? pay
        .map(
          (s) =>
            `<div class="settlement-item"><span><strong>${escapeHtml(s.from)}</strong> pays <strong>${escapeHtml(s.to)}</strong></span><b>${money(s.amount)}</b></div>`,
        )
        .join("")
    : '<div class="empty">✓ All settled! No payments needed.</div>';
  renderChart();
}
function renderChart() {
  const sums = {};
  for (const e of state.expenses)
    sums[e.category] = round((sums[e.category] || 0) + e.amount);
  const labels = Object.keys(sums),
    values = labels.map((k) => sums[k]);
  $("categoryLegend").innerHTML = labels
    .map(
      (k) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${CATEGORIES[k]?.color || "#aaa"}"></span>${escapeHtml(k)}</span>`,
    )
    .join("");
  $("chartFallback").classList.toggle(
    "hidden",
    !!labels.length && !!window.Chart,
  );
  $("expenseChart").classList.toggle("hidden", !labels.length || !window.Chart);
  if (chart) {
    chart.destroy();
    chart = null;
  }
  if (!labels.length || !window.Chart) {
    if (labels.length && !window.Chart)
      $("chartFallback").textContent =
        "Chart unavailable offline. Expense totals are still tracked.";
    return;
  }
  chart = new Chart($("expenseChart"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((k) => CATEGORIES[k]?.color || "#aaa"),
          borderWidth: 5,
          borderColor: "#fff",
          hoverOffset: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "73%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (c) => `${c.label}: ${money(c.parsed)}` },
        },
      },
    },
  });
}
function section(s) {
  currentSection = s;
  for (const name of ["dashboard", "expenses", "balances"]) {
    $(name + "Section").classList.toggle("hidden", name !== s);
  }
  document
    .querySelectorAll(".nav-link")
    .forEach((el) => el.classList.toggle("active", el.dataset.section === s));
  const titles = {
    dashboard: [
      "Overview",
      "Keep every adventure organized, down to the last rupee.",
    ],
    expenses: ["Expenses", "Every shared expense, all in one place."],
    balances: ["Balances", "See who owes whom and settle up easily."],
  };
  $("pageTitle").textContent = titles[s][0];
  $("pageSubtitle").textContent = titles[s][1];
  $("crumbName").textContent = s[0].toUpperCase() + s.slice(1);
}
function openModal(id) {
  $(id).classList.remove("hidden");
  $(id).querySelector("input,select,textarea")?.focus();
}
function closeModal(id) {
  $(id).classList.add("hidden");
}
function tripModal(edit = false) {
  editing = edit && !!state.trip;
  $("tripModalTitle").textContent = editing
    ? "Manage your trip"
    : "Create your trip";
  $("tripNameInput").value = editing ? state.trip.name : "";
  $("destinationInput").value = editing ? state.trip.destination : "";
  $("budgetInput").value = editing ? state.trip.budget : "";
  $("membersInput").value = editing ? state.trip.members.join(", ") : "";
  $("membersInput").disabled = editing && state.expenses.length > 0;
  openModal("tripModal");
}
function expenseModal() {
  if (!state.trip) {
    toast("Create a trip first.");
    tripModal();
    return;
  }
  $("expenseForm").reset();
  $("expenseDate").value = new Date().toLocaleDateString("en-CA");
  $("expensePayer").innerHTML = "";
  for (const m of state.trip.members) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    $("expensePayer").appendChild(opt);
  }
  updatePreview();
  openModal("expenseModal");
}
function updatePreview() {
  const n = state.trip?.members.length || 1,
    amount = Number($("expenseAmount").value) || 0;
  $("splitPreview").textContent =
    `Split equally among ${n} member${n === 1 ? "" : "s"} · ${money(amount / n)} each`;
}
document
  .querySelectorAll(".nav-link")
  .forEach((b) =>
    b.addEventListener("click", () => section(b.dataset.section)),
  );
$("viewAll").addEventListener("click", () => section("expenses"));
$("manageTrip").addEventListener("click", () => tripModal(!!state.trip));
$("newTrip").addEventListener("click", () => {
  if (
    state.trip &&
    !confirm(
      "Creating a new trip will replace the current trip and ALL its expenses in this browser. Continue?",
    )
  )
    return;
  tripModal(false);
});
$("addExpenseTop").addEventListener("click", expenseModal);
document
  .querySelectorAll("[data-close]")
  .forEach((b) =>
    b.addEventListener("click", () => closeModal(b.dataset.close)),
  );
document.querySelectorAll(".modal-overlay").forEach((m) =>
  m.addEventListener("click", (e) => {
    if (e.target === m) closeModal(m.id);
  }),
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape")
    document
      .querySelectorAll(".modal-overlay:not(.hidden)")
      .forEach((m) => closeModal(m.id));
});
$("tripForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("tripNameInput").value.trim(),
    destination = $("destinationInput").value.trim(),
    budget = Number($("budgetInput").value),
    members = $("membersInput")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  if (
    !name ||
    !destination ||
    !Number.isFinite(budget) ||
    budget <= 0 ||
    budget > 1e8
  ) {
    toast("Enter a valid trip name, destination and budget.");
    return;
  }
  if (
    !members.length ||
    members.length > 30 ||
    new Set(members.map((m) => m.toLowerCase())).size !== members.length
  ) {
    toast("Enter 1–30 unique member names separated by commas.");
    return;
  }
  if (members.some((m) => m.length > 35)) {
    toast("Member names must be at most 35 characters.");
    return;
  }
  if (editing) {
    state.trip = {
      ...state.trip,
      name,
      destination,
      budget,
      members: state.expenses.length ? state.trip.members : members,
    };
  } else {
    state = { trip: { name, destination, budget, members }, expenses: [] };
  }
  persist();
  closeModal("tripModal");
  render();
  toast(
    editing
      ? "Trip updated successfully."
      : "Trip created! Add your first expense.",
  );
});
$("expenseAmount").addEventListener("input", updatePreview);
$("expenseForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!state.trip) return;
  const title = $("expenseTitle").value.trim(),
    amount = Number($("expenseAmount").value),
    payer = $("expensePayer").value,
    category = $("expenseCategory").value,
    date = $("expenseDate").value;
  if (
    !title ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1e8 ||
    !state.trip.members.includes(payer) ||
    !CATEGORIES[category] ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(new Date(date + "T12:00:00").getTime())
  ) {
    toast("Please enter valid expense details.");
    return;
  }
  state.expenses.push({
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    title,
    amount: round(amount),
    payer,
    category,
    date,
    createdAt: Date.now(),
  });
  persist();
  closeModal("expenseModal");
  render();
  toast("Expense added and split equally!");
});
$("categoryFilter").addEventListener("change", render);
$("allExpenses").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-delete]");
  if (!btn) return;
  const exp = state.expenses.find((x) => x.id === btn.dataset.delete);
  if (!exp || !confirm(`Delete "${exp.title}"? This will update all balances.`))
    return;
  state.expenses = state.expenses.filter((x) => x.id !== exp.id);
  persist();
  render();
  toast("Expense deleted.");
});
$("resetData").addEventListener("click", () => {
  if (!confirm("Delete your trip and all expenses? This cannot be undone."))
    return;
  state = fresh();
  persist();
  section("dashboard");
  render();
  toast("All TripSplit data cleared.");
});
section("dashboard");
render();
