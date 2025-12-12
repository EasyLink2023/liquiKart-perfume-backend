import jwt from 'jsonwebtoken';
import { validationResult } from "express-validator";

import sequelize from "../config/database.js";

import sendResponse from "../utils/responseHelper.js";
import { sendVerificationEmail } from "../utils/mailer.js";

import userService from "../services/user.js";

const formatValidationErrors = (errors) => {
  const formattedErrors = {};
  errors.array().forEach(error => {
    if (!formattedErrors[error.path]) {
      formattedErrors[error.path] = [];
    }
    formattedErrors[error.path].push(error.msg);
  });
  return formattedErrors;
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatValidationErrors(errors)
      });
    }

    const { email, password } = req.body || {};

    const user = await userService.findUserByEmail(email);
    if (!user) {
      return sendResponse(res, {
        status: 401,
        message: "Invalid email or password"
      });
    }

    if (!user.is_active) {
      return sendResponse(res, {
        status: 403,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    if (!user.is_verified) {
      return sendResponse(res, {
        status: 403,
        message: "Please verify your email address before logging in. Check your inbox for the verification email.",
      });
    }

    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      return sendResponse(res, {
        status: 401,
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return sendResponse(res, {
      status: 200,
      message: "Login successful",
      data: { token, role: user.role },
    });

  } catch (err) {
    console.error("Login error:", err);
    return sendResponse(res, {
      status: 500,
      message: "Server error during login",
    });
  }
}

const signup = async (req, res) => {
  let transaction;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatValidationErrors(errors)
      });
    }

    transaction = await sequelize.transaction();

    const body = req.body || {};
    const {
      firstname,
      lastname,
      phone,
      email,
      password,
      dateOfBirth,
      gender,
      role = "CUSTOMER",
    } = body;

    const userId = await userService.createUser(
      {
        email,
        password,
        role,
        profile: {
          first_name: firstname,
          last_name: lastname,
          phone,
          date_of_birth: dateOfBirth,
          gender
        }
      }
    );

    const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    if (process.env.CLIENT_URL) {
      const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
      await sendVerificationEmail(email, verifyUrl);
    } else {
      console.warn("CLIENT_URL not configured, skipping verification email");
    }

    await transaction.commit();

    return sendResponse(res, {
      status: 201,
      message: "Signup successful. Please verify your email.",
    });
  } catch (err) {
    console.error("Signup error:", err);

    if (transaction) await transaction.rollback();

    return sendResponse(res, {
      status: 500,
      message: "Signup failed",
      data: process.env.SERVER_ENV === 'development' ? err.message : undefined,
    });
  }
}

export { login, signup };