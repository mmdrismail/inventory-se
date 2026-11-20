const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Support frontend demo tokens (e.g. demo-jwt-user-1-...)
  if (token && token.startsWith('demo-jwt-')) {
    const roleMatch = token.includes('manager')
      ? 'manager'
      : token.includes('staff')
      ? 'staff'
      : token.includes('customer')
      ? 'customer'
      : 'admin';
    const user = (await User.findOne({ role: roleMatch })) || (await User.findOne({ role: 'admin' }));
    if (user) {
      req.user = user;
      return next();
    }
  }

  if (!token) {
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_AUTH_BYPASS === 'true') {
      const devAdmin = await User.findOne({ role: 'admin' });
      if (devAdmin) {
        req.user = devAdmin;
        return next();
      }
    }
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please provide a valid Bearer token.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'stockline_super_secret_jwt_key_2026');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    // In development mode, gracefully fall back to admin user
    if (process.env.NODE_ENV === 'development') {
      const devAdmin = await User.findOne({ role: 'admin' });
      if (devAdmin) {
        req.user = devAdmin;
        return next();
      }
    }
    return res.status(401).json({
      success: false,
      message: 'Token verification failed or token has expired.',
      error: err.message,
    });
  }
};

module.exports = { protect };
