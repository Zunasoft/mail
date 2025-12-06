const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const auth = require('../middleware/authMiddleware');

// All routes require authentication
router.post('/', auth(['admin', 'manager']), budgetController.createTransaction);
router.get('/', auth(['admin', 'manager']), budgetController.getTransactions);
router.get('/analytics', auth(['admin', 'manager']), budgetController.getAnalytics);
router.post('/salary/:userId', auth(['admin']), budgetController.paySalary);
router.delete('/:id', auth(['admin', 'manager']), budgetController.deleteTransaction);

module.exports = router;
