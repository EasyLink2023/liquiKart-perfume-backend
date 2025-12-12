const roleMiddleware = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ message: `Access denied for ${requiredRole}` });
    }
    next();
  };
};

export const allowCustomer = roleMiddleware('CUSTOMER');
export const allowVendor = roleMiddleware('VENDOR');
export const allowAdmin = roleMiddleware('ADMIN');