// src/telegram/messageHandler.js
import { dayjs, TIMEZONE } from "../config.js";
import { extractJobInfo } from "../gemini.js";
import { buildTelegramMessage } from "./messageBuilder.js";

// Now accepts the state map as an argument
export function initializeMessageHandler(bot, db, awaitingJobInfo) {
    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userMessage = msg.text;

        // Ignore commands completely in this handler
        if (!userMessage || userMessage.startsWith("/")) {
            return;
        }

        // Check if this chat is waiting for job info
        if (awaitingJobInfo.has(chatId)) {
            // We got the message we were waiting for.
            // First, clear the state to prevent reprocessing.
            awaitingJobInfo.delete(chatId);

            // Check if the user wants to cancel
            if (userMessage.toLowerCase() === "exit") {
                bot.sendMessage(chatId, "Process ended.");
                return;
            }

            // Now, process the message as the job description.
            bot.sendMessage(chatId, "🧠 Got it! Extracting job info, please wait...");
            try {
                const jobInfo = await extractJobInfo(userMessage);
                if (!jobInfo || !jobInfo.deadline) {
                    await bot.sendMessage(
                        chatId,
                        "⚠️ Couldn't extract a valid deadline from that message. Please try the /add command again.",
                    );
                    return;
                }

                // --- DUPLICATE CHECK ---
                const duplicateQuery = await db
                    .collection("jobs")
                    .where("company", "==", jobInfo.company)
                    .where("role", "==", jobInfo.role)
                    .where("deadline", "==", jobInfo.deadline)
                    .limit(1)
                    .get();

                if (!duplicateQuery.empty) {
                    await bot.sendMessage(
                        chatId,
                        "⚠️ This job seems to be a duplicate of an existing entry and was not added.",
                    );
                    return;
                }

                const deadlineFormat = "DD/MM/YYYY HH:mm A";
                const deadline = dayjs.tz(jobInfo.deadline, deadlineFormat, TIMEZONE);

                if (!deadline.isValid()) {
                    await bot.sendMessage(
                        chatId,
                        `❌ Error: The AI returned an unreadable date: "${jobInfo.deadline}". Please try again.`,
                    );
                    return;
                }

                const initialMessage = `📢 *New Job Opportunity\\!*\n\n${buildTelegramMessage(jobInfo)}`;
                await bot.sendMessage(chatId, initialMessage, {
                    parse_mode: "MarkdownV2",
                    disable_web_page_preview: true,
                });

                await db.collection("jobs").add({
                    ...jobInfo,
                    chat_id: chatId,
                    deadline_timestamp: deadline.toDate(),
                    closed: false,
                });
                console.log(
                    `✅ Job added for "${jobInfo.company}" with deadline: ${deadline.format()}`,
                );
            } catch (err) {
                console.error("Bot 'message' event error:", err);
                await bot.sendMessage(
                    chatId,
                    "❌ A critical error occurred while processing your message.",
                );
            }
        }
        // If the chat is NOT in the awaiting state, do nothing. This ignores general chat.
    });
}
