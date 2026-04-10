const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Activity = require("../models/Activity");

// @route   GET /api/insights/tips
// @desc    Get personalized tip based on highest emission category
router.get("/tips", auth, async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const userActivities = await Activity.find({
      userId: req.user.id,
      date: { $gte: oneWeekAgo },
    });

    if (userActivities.length === 0) {
      return res.json({
        tip: "Start logging your activities to get personalized tips!",
      });
    }

    // Group by category and sum CO2
    const categorySums = userActivities.reduce((acc, act) => {
      acc[act.category] = (acc[act.category] || 0) + act.co2Value;
      return acc;
    }, {});

    let maxCategory = Object.keys(categorySums).reduce((a, b) =>
      categorySums[a] > categorySums[b] ? a : b,
    );

    const tips = {
      transport:
        "Try carpooling, public transport, or biking for short trips to reduce transport emissions.",
      food: "Consider reducing meat and dairy intake. A plant-based meal once a day makes a difference!",
      energy:
        "Switch to LED bulbs and unplug electronics when not in use to save energy.",
    };

    res.json({
      category: maxCategory,
      totalCO2: categorySums[maxCategory],
      tip: tips[maxCategory] || "Keep tracking to see more insights!",
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET /api/insights/community-average
// @desc    Get community average emissions for the past week
router.get("/community-average", auth, async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const result = await Activity.aggregate([
      { $match: { date: { $gte: oneWeekAgo } } },
      { $group: { _id: null, avgCO2: { $avg: "$co2Value" } } },
    ]);

    const average = result.length > 0 ? result[0].avgCO2 : 0;
    res.json({ average });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   GET /api/insights/weekly-summary
// @desc    Get user's weekly total and streak
router.get("/weekly-summary", auth, async (req, res) => {
  try {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const activities = await Activity.find({
      userId: req.user.id,
      date: { $gte: oneWeekAgo },
    });

    // Total CO2 for the week
    const totalCO2 = activities.reduce((sum, act) => sum + act.co2Value, 0);

    // Calculate streak: count consecutive days with at least one activity up to today
    const daysWithActivity = new Set();
    activities.forEach((act) => {
      const actDate = new Date(act.date).toDateString();
      daysWithActivity.add(actDate);
    });

    let streak = 0;
    const checkDate = new Date(today);
    while (true) {
      const dateStr = checkDate.toDateString();
      if (daysWithActivity.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    res.json({ totalCO2, streak });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
