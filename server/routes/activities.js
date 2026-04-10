const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Activity = require("../models/Activity");

// @route   GET /api/activities
// @desc    Get all activities for logged user
router.get("/", auth, async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.user.id }).sort({
      date: -1,
    });
    res.json(activities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST /api/activities
// @desc    Add a new activity
router.post("/", auth, async (req, res) => {
  const { category, description, co2Value } = req.body;
  try {
    const newActivity = new Activity({
      userId: req.user.id,
      category,
      description,
      co2Value,
    });
    const activity = await newActivity.save();
    res.json(activity);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   DELETE /api/activities/:id
// @desc    Delete an activity
router.delete("/:id", auth, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ msg: "Activity not found" });
    }
    if (activity.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }
    await activity.deleteOne();
    res.json({ msg: "Activity removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
