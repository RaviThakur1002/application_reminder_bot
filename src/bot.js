import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_TOKEN, TIMEZONE } from "./config.js";
import { db } from "./firebase.js";
import { initializeCommands } from "./telegram/commands.js";
import { initializeMessageHandler } from "./telegram/messageHandler.js";
import { initializeCronJob } from "./cron/reminderJob.js";

export default function runBot() {
    const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

    const awaitingJobInfo = new Map();

    const awaitingPlacedInfo = new Map();

    bot.setMyCommands([
        { command: "add", description: "Add a new job posting" },
        { command: "active", description: "Show all active job applications" },
        { command: "closed", description: "Show all closed job applications" },
        { command: "total", description: "Show the total number of jobs tracked" },
        { command: "add_placed", description: "Add a list of placed students" },
        {
            command: "total_placed",
            description: "Show the total count of placed students",
        },
        {
            command: "total_placed_name",
            description: "List all placed students by company",
        },
    ]);

    initializeCommands(bot, db, awaitingJobInfo, awaitingPlacedInfo);
    initializeMessageHandler(bot, db, awaitingJobInfo, awaitingPlacedInfo);
    initializeCronJob(bot, db);

    bot.on("polling_error", (error) => {
        console.error(`[POLLING ERROR] ${error.code}: ${error.message}.`);
    });

    console.log(
        `🤖 Bot is running with placed student tracking in the ${TIMEZONE} timezone.`,
    );
}
