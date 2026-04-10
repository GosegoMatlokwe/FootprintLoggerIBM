// Check auth
requireAuth();

let categoryChart = null;
let comparisonChart = null;

const dashboardUsername = document.getElementById("dashboard-username");
const streakCount = document.getElementById("streak-count");
const weeklyTotalSpan = document.getElementById("weekly-total");
const alltimeTotalSpan = document.getElementById("alltime-total");
const communityAvgSpan = document.getElementById("community-avg");
const personalizedTip = document.getElementById("personalized-tip");
const activityList = document.getElementById("dashboard-activity-list");

document.getElementById("dashboard-logout").addEventListener("click", logout);

async function loadDashboard() {
  try {
    // Get user info
    const user = await apiCall("/auth/user");
    dashboardUsername.textContent = user.username;

    // Get activities
    const activities = await apiCall("/activities");
    const allTimeTotal = activities.reduce((sum, act) => sum + act.co2Value, 0);
    alltimeTotalSpan.textContent = allTimeTotal.toFixed(2);

    // Filter last 7 days for weekly stats and chart
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyActivities = activities.filter(
      (act) => new Date(act.date) >= oneWeekAgo,
    );
    const weeklyTotal = weeklyActivities.reduce(
      (sum, act) => sum + act.co2Value,
      0,
    );
    weeklyTotalSpan.textContent = weeklyTotal.toFixed(2);

    // Weekly summary (streak and total from backend)
    const summary = await apiCall("/insights/weekly-summary");
    streakCount.textContent = summary.streak || 0;

    // Community average
    const commAvg = await apiCall("/insights/community-average");
    communityAvgSpan.textContent = commAvg.average.toFixed(2);

    // Personalized tip
    const tipData = await apiCall("/insights/tips");
    personalizedTip.textContent = tipData.tip;

    // Render category chart for weekly activities
    const categorySums = { transport: 0, food: 0, energy: 0 };
    weeklyActivities.forEach((act) => {
      categorySums[act.category] += act.co2Value;
    });

    const ctxCat = document
      .getElementById("dashboard-category-chart")
      .getContext("2d");
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctxCat, {
      type: "bar",
      data: {
        labels: ["Transport", "Food", "Energy"],
        datasets: [
          {
            label: "CO₂ (kg)",
            data: [
              categorySums.transport,
              categorySums.food,
              categorySums.energy,
            ],
            backgroundColor: ["#f97316", "#10b981", "#3b82f6"],
          },
        ],
      },
      options: { responsive: true },
    });

    // Comparison chart: User weekly total vs community average
    const ctxComp = document
      .getElementById("comparison-chart")
      .getContext("2d");
    if (comparisonChart) comparisonChart.destroy();
    comparisonChart = new Chart(ctxComp, {
      type: "bar",
      data: {
        labels: ["Your Weekly Total", "Community Average (per user)"],
        datasets: [
          {
            label: "CO₂ (kg)",
            data: [weeklyTotal, commAvg.average],
            backgroundColor: ["#0ea5e9", "#94a3b8"],
          },
        ],
      },
      options: { responsive: true },
    });

    // Activity list (recent 10)
    activityList.innerHTML = "";
    activities.slice(0, 10).forEach((act) => {
      const li = document.createElement("li");
      const date = new Date(act.date).toLocaleDateString();
      li.innerHTML = `<span>${act.description} (${act.category})</span> <span>${act.co2Value.toFixed(2)} kg CO₂ - ${date}</span>`;
      activityList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    if (
      err.message.includes("authorization") ||
      err.message.includes("token")
    ) {
      logout();
    }
  }
}

loadDashboard();
