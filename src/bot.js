// src/bot.js
import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_TOKEN, TIMEZONE } from "./config.js";
import { db } from "./firebase.js";
import { initializeCommands } from "./telegram/commands.js";
import { initializeMessageHandler } from "./telegram/messageHandler.js";
import { initializeCronJob } from "./cron/reminderJob.js";

export default function runBot() {
    const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

    const awaitingJobInfo = new Map();

    bot.setMyCommands([
        { command: "add", description: "Add a new job posting" },
        { command: "active", description: "Show all active job applications" },
        { command: "closed", description: "Show all closed job applications" },
        { command: "total", description: "Show the total number of jobs tracked" },
    ]);

    initializeCommands(bot, db, awaitingJobInfo);
    initializeMessageHandler(bot, db, awaitingJobInfo);
    initializeCronJob(bot, db);

    bot.on("polling_error", (error) => {
        console.error(`[POLLING ERROR] ${error.code}: ${error.message}.`);
    });

    console.log(
        `🤖 Bot is running with conversational /add command in the ${TIMEZONE} timezone.`,
    );
}
