const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

router.get('/', userController.getUsers);
router.put('/:id', auth(['admin']), userController.updateUser);

module.exports = router;
