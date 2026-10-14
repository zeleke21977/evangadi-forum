import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { safeExecute } from "../../../../db/config.js";
import {
  BadRequestError,
  UnauthenticatedError,
} from "../../../utils/errors/index.js";
import { OAuth2Client } from "google-auth-library";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID environment variable is required");
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const normalizeEmail = (email) => email.trim().toLowerCase();

/**
 * Checks if a user exists by email.
 *
 * @param {string} email - The email to check.
 * @returns {Promise<boolean>} True if the user exists, false otherwise.
 */
export const checkUserExists = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const sql = "SELECT user_id FROM users WHERE email = ? LIMIT 1";
  const rows = await safeExecute(sql, [normalizedEmail]);
  return rows.length > 0; //if user exists row.length willbe > 0 and checkUserExists returns true
};

/**
 * Registers a new user in the database.
 *
 * @param {Object} userData - The user data.
 * @param {string} userData.firstName - The first name.
 * @param {string} userData.lastName - The last name.
 * @param {string} userData.email - The email address.
 * @param {string} userData.password - The plain text password.
 * @returns {Promise<Object>} The created user object (without password).
 */
export const registerService = async ({
  firstName,
  lastName,
  email,
  password,
}) => {
  // Call normalizeEmail to trim whitespace and convert the email to lowercase
  // so that email comparisons are consistent
  const normalizedEmail = normalizeEmail(email);

  // Check if a user already exists with this email to prevent duplicate accounts.
  // This provides an application-level check before attempting the database insert.
  const userExists = await checkUserExists(normalizedEmail);
  // if the user already exists, it throws an error, and the registration won't continue
  if (userExists) {
    throw new BadRequestError("User already exists with this email.");
  }

  // Generate a new random salt for this password.
  // The salt is different each time bcrypt.genSalt() is called.
  const salt = await bcrypt.genSalt(10);

  // Hash the user's password using the generated salt.
  // The original password is never stored directly in the database.
  const hashedPassword = await bcrypt.hash(password, salt);

  //  insert the new user's data into the database
  const sql =
    "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)";

  let result;

  try {
    // Execute the INSERT query with the user's data
    result = await safeExecute(sql, [
      firstName,
      lastName,
      normalizedEmail,
      hashedPassword,
    ]);
  } catch (error) {
    // If the database detects a duplicate email, return error
    // This protects against duplicates even if two requests pass the checkUserExists() check at the same time
    //ER_DUP_ENTRY: is mtsql error that tells us we're trying to insert a value that already exists in colunm that is set to be unique
    if (error?.code === "ER_DUP_ENTRY") {
      throw new BadRequestError("User already exists with this email.");
    }

    // Pass any other database error to the error-handling middleware
    throw error;
  }

  // Return the newly created user's information.
  // The password/hash is intentionally not included in the response.
  return {
    id: result.insertId,
    firstName,
    lastName,
    email: normalizedEmail,
  };
};

/**
 * Authenticates a user and generates a JWT token.
 *
 * @param {Object} credentials - The login credentials.
 * @param {string} credentials.email - The user's email.
 * @param {string} credentials.password - The user's plain text password.
 * @returns {Promise<Object>} An object containing the user and token.
 * @throws {UnauthenticatedError} If authentication fails.
 */
export const loginService = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const sql =
    "SELECT user_id, first_name, last_name, email, password_hash, avatar FROM users WHERE email = ? LIMIT 1";
  const rows = await safeExecute(sql, [normalizedEmail]); //protecting against SQL injection by using parameterized queries

  if (rows.length === 0) {
    throw new UnauthenticatedError("Invalid email or password");
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new UnauthenticatedError("Invalid email or password");
    //we should not specify which one is incorrect for security reasons, so we use a generic message
  }

  const payload = {
    id: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }); // Generate a JWT token with the user's ID and name, signed with the secret key, and set to expire in the given time

  return {
    user: {
      id: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      avatar: user.avatar,
    },
    token,
  };
};

const RESET_TOKEN_EXPIRES_IN = "15m";

const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export const forgotPasswordService = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const sql =
    "SELECT user_id, first_name, email FROM users WHERE email = ? LIMIT 1";
  const rows = await safeExecute(sql, [normalizedEmail]);

  // Do not reveal whether the email exists.
  if (rows.length === 0) {
    return;
  }

  const user = rows[0];
  const resetToken = jwt.sign(
    { id: user.user_id, type: "password-reset" },
    JWT_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRES_IN },
  );

  const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;

  const transporter = createEmailTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Reset your Evangadi Forum password",
    text: `Hello ${user.first_name},\n\nClick this link to reset your password: ${resetLink}\n\nThis link expires in 15 minutes.`,
  });
};

export const resetPasswordService = async ({ token, password }) => {
  let decoded;

  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new UnauthenticatedError("Invalid or expired reset link.");
  }

  if (decoded.type !== "password-reset") {
    throw new UnauthenticatedError("Invalid or expired reset link.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await safeExecute(
    "UPDATE users SET password_hash = ? WHERE user_id = ?",
    [hashedPassword, decoded.id],
  );

  if (result.affectedRows === 0) {
    throw new UnauthenticatedError("Invalid or expired reset link.");
  }
};

export const googleLoginService = async (credential) => {
  if (!credential) {
    throw new UnauthenticatedError("Google credential is required.");
  }

  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    throw new UnauthenticatedError("Invalid Google credential.");
  }

  const payload = ticket.getPayload();

  if (!payload) {
    throw new UnauthenticatedError("Invalid Google credential.");
  }

  const {
    sub: googleId,
    email,
    given_name: firstName,
    family_name: lastName,
    email_verified: emailVerified,
  } = payload;

  if (!email || !emailVerified || !googleId) {
    throw new UnauthenticatedError("Unable to verify Google account.");
  }

  const normalizedEmail = normalizeEmail(email);

  const rows = await safeExecute(
    `SELECT user_id, first_name, last_name, email, password_hash, avatar,
            google_id, auth_provider
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [normalizedEmail],
  );

  let user;

  if (rows.length > 0) {
    user = rows[0];

    if (user.google_id && user.google_id !== googleId) {
      throw new BadRequestError(
        "This email is already connected to another Google account.",
      );
    }

    if (!user.google_id) {
      await safeExecute(
        `UPDATE users
         SET google_id = ?, auth_provider = 'google'
         WHERE user_id = ?`,
        [googleId, user.user_id],
      );
    }
  } else {
    const result = await safeExecute(
      `INSERT INTO users
       (first_name, last_name, email, password_hash, google_id, auth_provider)
       VALUES (?, ?, ?, NULL, ?, 'google')`,
      [firstName || "", lastName || "", normalizedEmail, googleId],
    );

    user = {
      user_id: result.insertId,
      first_name: firstName || "",
      last_name: lastName || "",
      email: normalizedEmail,
    };
  }

  const jwtPayload = {
    id: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
  };

  const token = jwt.sign(jwtPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    user: {
      id: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      avatar: user.avatar,
    },
    token,
  };
};
