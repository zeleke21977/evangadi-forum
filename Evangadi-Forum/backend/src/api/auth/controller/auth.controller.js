import { StatusCodes } from "http-status-codes";
import {
  registerService,
  loginService,
  forgotPasswordService,
  resetPasswordService,
  googleLoginService,
} from "../service/auth.service.js";

/**
 * Handles user registration requests.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const registerController = async (req, res, next) => {
  try {
    // Destructure the request body data that comes from the frontend form
    const { firstName, lastName, email, password } = req.body;
    // Call registerService to handle the business logic and store the result in newUser
    const newUser = await registerService({
      firstName,
      lastName,
      email,
      password,
    });
    // Send the returned user data from registerService back to the frontend
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User registered successfully.",
      user: newUser,
    });
  } catch (error) {
    //if there is error pass it to the the error-handler-middleware(errorHander)
    next(error);
  }
};

/**
 * Handles user login requests.
 *
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next function.
 * @returns {Promise<void>}
 */
export const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const authResult = await loginService({ email, password });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Login successful.",
      user: authResult.user,
      token: authResult.token,
    });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    const result = await googleLoginService(credential);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Google login successful.",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordController = async (req, res, next) => {
  try {
    await forgotPasswordService(req.body.email);
    res.status(StatusCodes.OK).json({
      success: true,
      message:
        "If an account exists with that email, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordController = async (req, res, next) => {
  try {
    await resetPasswordService({
      token: req.body.token,
      password: req.body.password,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Password reset successfully. Please log in.",
    });
  } catch (error) {
    next(error);
  }
};
