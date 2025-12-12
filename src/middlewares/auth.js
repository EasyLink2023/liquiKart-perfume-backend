import jwt from 'jsonwebtoken';
import sendResponse from "../utils/responseHelper.js";

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return sendResponse(res, {
      status: 401,
      success: false,
      message: "Unauthorized access. Please log in to continue.",
      data: null,
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return sendResponse(res, {
      status: 401,
      success: false,
      message: "Your session has expired. Please log in again.",
      data: null,
    });
  }
};

export default authenticate;