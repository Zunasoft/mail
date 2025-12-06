const User = require('../models/User');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // Exclude password
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isApproved, isActive } = req.body;
    
    // Construct update data dynamically
    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (isApproved !== undefined) updateData.isApproved = isApproved;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
