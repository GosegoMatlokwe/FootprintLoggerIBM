// Preset activities with CO2 per unit
const PRESETS = {
  transport: [
    { name: "Car (petrol)", unit: "km", co2PerUnit: 0.24 },
    { name: "Car (diesel)", unit: "km", co2PerUnit: 0.27 },
    { name: "Bus", unit: "km", co2PerUnit: 0.1 },
    { name: "Flight (short haul)", unit: "km", co2PerUnit: 0.18 },
  ],
  food: [
    { name: "Beef", unit: "kg", co2PerUnit: 27.0 },
    { name: "Chicken", unit: "kg", co2PerUnit: 6.9 },
    { name: "Vegetables", unit: "kg", co2PerUnit: 2.0 },
    { name: "Dairy (milk)", unit: "L", co2PerUnit: 3.2 },
  ],
  energy: [
    { name: "Electricity (grid)", unit: "kWh", co2PerUnit: 0.5 },
    { name: "Natural Gas", unit: "therm", co2PerUnit: 5.3 },
  ],
};

let currentActivities = []; // from localStorage or API
let chartInstance = null;

// DOM elements
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showLoginBtn = document.getElementById("show-login");
const showRegBtn = document.getElementById("show-register");
const authMessage = document.getElementById("auth-message");
const logoutBtn = document.getElementById("logout-btn");
const welcomeUser = document.getElementById("welcome-user");
const activityForm = document.getElementById("activity-form");
const categorySelect = document.getElementById("category");
const presetSelect = document.getElementById("activity-preset");
const quantityInput = document.getElementById("quantity");
const co2Display = document.getElementById("co2-value-display");
const filterSelect = document.getElementById("filter-category");
const totalEmissionsSpan = document.getElementById("total-emissions");
const activityList = document.getElementById("activity-list");

// Initialize auth UI
function initAuth() {
  if (isLoggedIn()) {
    showApp();
    loadUserData();
    loadActivities();
  } else {
    showAuth();
  }
}

function showAuth() {
  authSection.style.display = "block";
  appSection.style.display = "none";
}

function showApp() {
  authSection.style.display = "none";
  appSection.style.display = "block";
}

// Tab switching
showLoginBtn.addEventListener("click", () => {
  loginForm.classList.add("active");
  registerForm.classList.remove("active");
  showLoginBtn.classList.add("active");
  showRegBtn.classList.remove("active");
});

showRegBtn.addEventListener("click", () => {
  registerForm.classList.add("active");
  loginForm.classList.remove("active");
  showRegBtn.classList.add("active");
  showLoginBtn.classList.remove("active");
});

// Auth form handlers
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    const data = await apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    showApp();
    loadUserData();
    loadActivities();
  } catch (err) {
    authMessage.textContent = err.message;
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("reg-username").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  try {
    const data = await apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    setToken(data.token);
    showApp();
    loadUserData();
    loadActivities();
  } catch (err) {
    authMessage.textContent = err.message;
  }
});

logoutBtn.addEventListener("click", logout);

// Load user info
async function loadUserData() {
  try {
    const user = await apiCall("/auth/user");
    welcomeUser.textContent = `Welcome, ${user.username}`;
  } catch (err) {
    console.error(err);
    logout();
  }
}

// Populate presets based on category
categorySelect.addEventListener("change", () => {
  const cat = categorySelect.value;
  presetSelect.innerHTML = '<option value="">Select Activity</option>';
  if (cat && PRESETS[cat]) {
    PRESETS[cat].forEach((preset, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = `${preset.name} (${preset.co2PerUnit} kg CO₂ per ${preset.unit})`;
      presetSelect.appendChild(option);
    });
  }
  updateCO2Display();
});

presetSelect.addEventListener("change", updateCO2Display);
quantityInput.addEventListener("input", updateCO2Display);

function updateCO2Display() {
  const cat = categorySelect.value;
  const presetIndex = presetSelect.value;
  const qty = parseFloat(quantityInput.value) || 0;
  if (cat && presetIndex !== "") {
    const preset = PRESETS[cat][presetIndex];
    const co2 = qty * preset.co2PerUnit;
    co2Display.textContent = co2.toFixed(2);
  } else {
    co2Display.textContent = "0";
  }
}

// Activity form submission
activityForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const cat = categorySelect.value;
  const presetIndex = presetSelect.value;
  const qty = parseFloat(quantityInput.value);
  if (!cat || presetIndex === "" || qty <= 0) return;
  const preset = PRESETS[cat][presetIndex];
  const co2 = qty * preset.co2PerUnit;
  const activity = {
    category: cat,
    description: `${preset.name} (${qty} ${preset.unit})`,
    co2Value: co2,
  };

  try {
    const saved = await apiCall("/activities", {
      method: "POST",
      body: JSON.stringify(activity),
    });
    currentActivities.unshift(saved);
    updateUI();
    activityForm.reset();
    categorySelect.dispatchEvent(new Event("change"));
    quantityInput.value = "";
    co2Display.textContent = "0";
  } catch (err) {
    alert("Failed to save activity: " + err.message);
  }
});

// Load activities from server
async function loadActivities() {
  try {
    currentActivities = await apiCall("/activities");
    updateUI();
  } catch (err) {
    console.error(err);
  }
}

// Filter activities based on selection
function getFilteredActivities() {
  const filter = filterSelect.value;
  if (filter === "all") return currentActivities;
  return currentActivities.filter((act) => act.category === filter);
}

// Update UI: total, list, chart
function updateUI() {
  const filtered = getFilteredActivities();
  const total = filtered.reduce((sum, act) => sum + act.co2Value, 0);
  totalEmissionsSpan.textContent = total.toFixed(2);

  // Render list
  activityList.innerHTML = "";
  filtered.slice(0, 20).forEach((act) => {
    const li = document.createElement("li");
    const date = new Date(act.date).toLocaleDateString();
    li.innerHTML = `<span>${act.description} (${act.category})</span> <span>${act.co2Value.toFixed(2)} kg CO₂ - ${date}</span>`;
    activityList.appendChild(li);
  });

  // Render chart by category sum
  const categoryData = {
    transport: 0,
    food: 0,
    energy: 0,
  };
  filtered.forEach((act) => {
    categoryData[act.category] += act.co2Value;
  });

  const ctx = document.getElementById("category-chart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Transport", "Food", "Energy"],
      datasets: [
        {
          data: [
            categoryData.transport,
            categoryData.food,
            categoryData.energy,
          ],
          backgroundColor: ["#f97316", "#10b981", "#3b82f6"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
      },
    },
  });
}

filterSelect.addEventListener("change", updateUI);

// Start
initAuth();
