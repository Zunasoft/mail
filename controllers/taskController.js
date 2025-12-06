const Task = require('../models/Task');
const User = require('../models/User');

exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, status, timeTaken, deadline } = req.body;
    // Determine assigned user: if assignedTo is provided (by admin/manager), use it. Else default to self.
    const assignee = assignedTo || req.user.userId;
    
    const task = new Task({
      title, description, assignedTo: assignee, status, timeTaken, deadline, createdBy: req.user.userId
    });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate('assignedTo', 'username email');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndUpdate(id, req.body, { new: true });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
      await Task.findByIdAndDelete(req.params.id);
      res.json({ message: 'Task deleted' });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const stats = await Task.aggregate([
            { $match: { status: 'Done' } }, // Only count completed tasks
            {
                $group: {
                    _id: '$assignedTo',
                    tasksCompleted: { $sum: 1 },
                    totalTime: { $sum: '$timeTaken' },
                    // Calculate "Score": (Tasks * 10) - (AvgTime * 0.5) - just internal logic
                }
            }
        ]);
        
        // Populate User Details
        const leaderboard = await User.populate(stats, { path: '_id', select: 'username email' });

        // Calculate advanced metrics
        const enrichedLeaderboard = leaderboard.map(stat => {
            const avgTime = stat.totalTime / stat.tasksCompleted;
            const score = Math.round((stat.tasksCompleted * 10) - (avgTime * 0.5)); // Simple formula
            return {
                ...stat,
                avgTime: avgTime.toFixed(1),
                score: score > 0 ? score : 0 // Floor at 0
            };
        });

        // Sort by Score descending
        enrichedLeaderboard.sort((a, b) => b.score - a.score);

        res.json(enrichedLeaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
