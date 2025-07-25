// src/config.js
import dotenv from "dotenv";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

// Load environment variables from .env file
dotenv.config();

// Configure Dayjs with all necessary plugins
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Define constants to be used across the application
export const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TIMEZONE = "Asia/Kolkata";

// Set the default timezone for all dayjs operations
dayjs.tz.setDefault(TIMEZONE);

// Export the configured dayjs instance
export { dayjs };
