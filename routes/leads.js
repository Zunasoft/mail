const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const auth = require('../middleware/authMiddleware');

router.post('/', leadController.createLead); // Public
router.get('/', auth(['admin', 'manager', 'sales']), leadController.getLeads);
router.put('/:id/stage', auth(['admin', 'manager', 'sales']), leadController.updateLeadStage);
router.put('/:id/pick', auth(['sales']), leadController.pickLead); // Sales only

router.get('/analytics', auth(['admin', 'manager']), leadController.getAnalytics);

// Stage Management
router.get('/stages', auth(['admin', 'manager', 'sales']), leadController.getStages);
router.post('/stages', auth(['admin', 'manager']), leadController.createStage);
router.delete('/stages/:id', auth(['admin', 'manager']), leadController.deleteStage);

module.exports = router;
