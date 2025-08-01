import dotenv from "dotenv";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dotenv.config();

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TIMEZONE = "Asia/Kolkata";

dayjs.tz.setDefault(TIMEZONE);

export { dayjs };
