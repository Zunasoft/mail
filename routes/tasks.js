const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth(), taskController.createTask);
router.get('/', auth(), taskController.getTasks);
router.get('/leaderboard', auth(), taskController.getLeaderboard); // All authenticated users can view
router.put('/:id', auth(), taskController.updateTask);
router.delete('/:id', auth(), taskController.deleteTask);

module.exports = router;
