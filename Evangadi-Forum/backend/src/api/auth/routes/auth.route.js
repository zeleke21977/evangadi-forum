import express from "express";
import {
  registerController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
  googleLogin,
} from "../controller/auth.controller.js";
import {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "../validations/auth.validation.js";

import {
  authLimiter,
  forgotPasswordLimiter,
} from "../../../middleware/rate-limit.js";

const router = express.Router();
router.use(authLimiter);

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post("/register", registerValidation, registerController);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post("/login", loginValidation, loginController);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPasswordValidation,
  forgotPasswordController,
);
router.post(
  "/reset-password",
  resetPasswordValidation,
  resetPasswordController,
);

router.post("/google", googleLogin);

export default router;
