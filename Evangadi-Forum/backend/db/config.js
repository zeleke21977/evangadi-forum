import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

// Database connection pool
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  // Secure connection to Aiven MySQL
  ssl: {
    rejectUnauthorized: true,
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const ensureParams = (params) => {
  if (params === undefined || params === null) {
    throw new Error("SQL parameters are required");
  }

  const isArray = Array.isArray(params);
  const isObject = !isArray && typeof params === "object";

  if (!isArray && !isObject) {
    throw new Error("SQL parameters must be an array or object");
  }
};

export const safeExecute = async (sql, params) => {
  if (typeof sql !== "string" || sql.trim().length === 0) {
    throw new Error("SQL query must be a non-empty string");
  }

  ensureParams(params);

  const [result] = await db.execute(sql, params);
  return result;
};
