const jwt = require('jsonwebtoken');

module.exports = (roles = []) => {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'Auth failed' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      req.user = decoded;

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: 'Auth failed' });
    }
  };
};
