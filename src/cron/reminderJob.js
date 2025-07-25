// src/cron/reminderJob.js
import cron from "node-cron";
import { dayjs } from "../config.js";
import {
    buildTelegramMessage,
    formatRemainingTime,
} from "../telegram/messageBuilder.js";

export function initializeCronJob(bot, db) {
    // Runs every 30 minutes
    cron.schedule("*/30 * * * *", async () => {
        const now = dayjs(); // Already in the correct timezone due to config.js

        const jobsSnapshot = await db
            .collection("jobs")
            .where("closed", "==", false)
            .get();
        if (jobsSnapshot.empty) {
            return;
        }

        for (const doc of jobsSnapshot.docs) {
            const job = doc.data();
            if (!job.deadline_timestamp) {
                continue;
            }

            const deadline = dayjs(job.deadline_timestamp.toDate());
            const totalMinutes = deadline.diff(now, "minutes");

            let reminderMsg = null;
            let reminderFlag = null;

            if (totalMinutes < 0 && totalMinutes > -120 && !job.reminded_closed) {
                reminderMsg = "⚫️ *Deadline Closed*";
                reminderFlag = "reminded_closed";
            } else if (totalMinutes <= 60 && totalMinutes > 0 && !job.reminded_1) {
                reminderMsg = `🔴 *Less than 1 hour remaining\\!*\n⏰ *Exact time left: ${formatRemainingTime(totalMinutes)}*`;
                reminderFlag = "reminded_1";
            } else if (totalMinutes <= 360 && totalMinutes > 60 && !job.reminded_6) {
                reminderMsg = `🟠 *Less than 6 hours remaining\\!*\n⏰ *Exact time left: ${formatRemainingTime(totalMinutes)}*`;
                reminderFlag = "reminded_6";
            } else if (
                totalMinutes <= 720 &&
                totalMinutes > 360 &&
                !job.reminded_12
            ) {
                reminderMsg = `🟡 *Less than 12 hours remaining\\!*\n⏰ *Exact time left: ${formatRemainingTime(totalMinutes)}*`;
                reminderFlag = "reminded_12";
            } else if (
                totalMinutes <= 1440 &&
                totalMinutes > 720 &&
                !job.reminded_24
            ) {
                reminderMsg = `🔵 *Less than 24 hours remaining\\!*\n⏰ *Exact time left: ${formatRemainingTime(totalMinutes)}*`;
                reminderFlag = "reminded_24";
            }

            if (reminderMsg && reminderFlag) {
                const fullJobMessage = buildTelegramMessage(job);
                const finalMessage = `${reminderMsg}\n\n${fullJobMessage}`;

                try {
                    await bot.sendMessage(job.chat_id, finalMessage, {
                        parse_mode: "MarkdownV2",
                        disable_web_page_preview: true,
                    });

                    const updateData = { [reminderFlag]: true };
                    if (reminderFlag === "reminded_closed") {
                        updateData.closed = true;
                    }
                    await db.collection("jobs").doc(doc.id).update(updateData);
                } catch (error) { }
            }
        }
    });
}
