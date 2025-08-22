import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_TOKEN, TIMEZONE } from "./config.js";
import { db } from "./firebase.js";
import { initializeCommands } from "./telegram/commands.js";
import { initializeMessageHandler } from "./telegram/messageHandler.js";
import { initializeCronJob } from "./cron/reminderJob.js";

export default function runBot() {
    const app = express();
    app.use(express.json());

    const bot = new TelegramBot(TELEGRAM_TOKEN);

    const webhookPath = `/webhook/${TELEGRAM_TOKEN}`;
    const webhookUrl = `https://application-reminder-bot.onrender.com${webhookPath}`;
    bot.setWebHook(webhookUrl);

    app.post(webhookPath, (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    });

    app.get("/", (req, res) => {
        res.send("alive");
    });

    const awaitingJobInfo = new Map();
    const awaitingPlacedInfo = new Map();

    bot.setMyCommands([
        { command: "add", description: "Add a new job posting" },
        { command: "active", description: "Show all active job applications" },
        { command: "closed", description: "Show all closed job applications" },
        { command: "total", description: "Show the total number of jobs tracked" },
        { command: "placed_add", description: "Add a list of placed students" },
        {
            command: "placed_total",
            description: "Show the count of total placed students",
        },
        {
            command: "placed_details",
            description: "Show placed students by company",
        },
    ]);

    initializeCommands(bot, db, awaitingJobInfo, awaitingPlacedInfo);
    initializeMessageHandler(bot, db, awaitingJobInfo, awaitingPlacedInfo);
    initializeCronJob(bot, db);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🤖 Bot running in ${TIMEZONE} timezone on port ${PORT}`);
        console.log(`🌐 Webhook set to ${webhookUrl}`);
    });
}
