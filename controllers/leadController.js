const Lead = require('../models/Lead');
const Stage = require('../models/Stage');
const nodemailer = require('nodemailer');

exports.createLead = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    // Save to DB
    const lead = new Lead({ name, email, phone, message });
    await lead.save();

    // Send Email (preserving old functionality)
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const mailOptions = {
        from: email || process.env.EMAIL_USER,
        to: 'info@zunasoft.com',
        subject: `New Lead: ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`,
    };

    transporter.sendMail(mailOptions, (err) => { if (err) console.error("Email error:", err); });

    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLeads = async (req, res) => {
  try {
    // If admin/manager, see all. If sales, see all UNASSIGNED or ASSIGNED TO THEM.
    let query = {};
    if (req.user.role === 'sales') {
        query = { $or: [{ assignedTo: null }, { assignedTo: req.user.userId }] };
    }
    const leads = await Lead.find(query).populate('assignedTo', 'username').sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateLeadStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    const lead = await Lead.findById(id);
    
    // Authorization check: Sales can only move their own leads
    if (req.user.role === 'sales' && lead.assignedTo && lead.assignedTo.toString() !== req.user.userId) {
        return res.status(403).json({ message: 'Not authorized to update this lead' });
    }

    lead.stage = stage;
    lead.history.push({ action: `Moved to ${stage}`, by: req.user.userId });
    await lead.save();
    
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.pickLead = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id);
        if (lead.assignedTo) return res.status(400).json({ message: 'Lead already assigned' });
        
        lead.assignedTo = req.user.userId;
        lead.history.push({ action: 'Picked lead', by: req.user.userId });
        await lead.save();
        
        res.json(lead);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getStages = async (req, res) => {
    try {
        const stages = await Stage.find().sort({ order: 1 });
        if (stages.length === 0) {
            // Seed default stages if empty
            await Stage.insertMany([
                { name: 'New Lead', order: 0 },
                { name: 'Contacted', order: 1 },
                { name: 'In Progress', order: 2 },
                { name: 'Negotiation', order: 3 },
                { name: 'Completed Lead', order: 4 },
                { name: 'Lost', order: 5 }
            ]);
            return res.json(await Stage.find().sort({ order: 1 }));
        }
        res.json(stages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createStage = async (req, res) => {
    try {
        const { name } = req.body;
        const count = await Stage.countDocuments();
        const stage = new Stage({ name, order: count });
        await stage.save();
        res.json(stage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteStage = async (req, res) => {
    try {
        const { id } = req.params;
        const stage = await Stage.findById(id);
        
        if (!stage) return res.status(404).json({ message: 'Stage not found' });
        
        // Protect defaults
        if (['New Lead', 'Completed Lead'].includes(stage.name)) {
            return res.status(400).json({ message: 'Cannot delete default stages' });
        }
        
        // Check for leads
        const leadCount = await Lead.countDocuments({ stage: stage.name });
        if (leadCount > 0) {
            return res.status(400).json({ message: 'Cannot delete stage with leads' });
        }
        
        await Stage.findByIdAndDelete(id);
        res.json({ message: 'Stage deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const total = await Lead.countDocuments();
        const completed = await Lead.countDocuments({ stage: 'Completed Lead' });
        res.json({ total, completed, conversionRate: total ? (completed/total)*100 : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
