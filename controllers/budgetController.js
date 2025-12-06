const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const { type, category, amount, description, date, paidTo } = req.body;
    
    const transaction = new Transaction({
      type,
      category,
      amount,
      description,
      date: date || new Date(),
      paidTo,
      createdBy: req.user.userId
    });
    
    await transaction.save();
    const populated = await Transaction.findById(transaction._id)
      .populate('paidTo', 'username email')
      .populate('createdBy', 'username');
    
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all transactions with filters
exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query;
    
    let filter = {};
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    
    const transactions = await Transaction.find(filter)
      .populate('paidTo', 'username email')
      .populate('createdBy', 'username')
      .sort({ date: -1 });
    
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get budget analytics
exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(filter);
    
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expenses;
    const profit = balance;
    
    // Category breakdown
    const categoryBreakdown = {};
    transactions.forEach(t => {
      if (!categoryBreakdown[t.category]) {
        categoryBreakdown[t.category] = { income: 0, expense: 0 };
      }
      categoryBreakdown[t.category][t.type] += t.amount;
    });
    
    // Monthly trend (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthTransactions = transactions.filter(t => 
        t.date >= monthStart && t.date <= monthEnd
      );
      
      const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const monthExpenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      monthlyData.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        income: monthIncome,
        expenses: monthExpenses,
        profit: monthIncome - monthExpenses
      });
    }
    
    res.json({
      totalIncome: income,
      totalExpenses: expenses,
      balance,
      profit,
      categoryBreakdown,
      monthlyData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Pay salary to a user
exports.paySalary = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, description } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const transaction = new Transaction({
      type: 'expense',
      category: 'salary',
      amount,
      description: description || `Salary payment to ${user.username}`,
      date: new Date(),
      paidTo: userId,
      createdBy: req.user.userId
    });
    
    await transaction.save();
    const populated = await Transaction.findById(transaction._id)
      .populate('paidTo', 'username email')
      .populate('createdBy', 'username');
    
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
