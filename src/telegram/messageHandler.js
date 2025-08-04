import { dayjs, TIMEZONE } from "../config.js";
import { extractJobInfo, extractPlacedInfo } from "../gemini.js";
import { buildTelegramMessage } from "./messageBuilder.js";

export function initializeMessageHandler(
    bot,
    db,
    awaitingJobInfo,
    awaitingPlacedInfo,
) {
    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userMessage = msg.text;

        if (!userMessage || userMessage.startsWith("/")) {
            return;
        }

        if (awaitingJobInfo.has(chatId)) {
            awaitingJobInfo.delete(chatId);

            if (userMessage.toLowerCase() === "exit") {
                bot.sendMessage(chatId, "Process ended.");
                return;
            }

            bot.sendMessage(chatId, "🧠 Got it! Extracting job info, please wait...");
            try {
                const jobInfo = await extractJobInfo(userMessage);
                if (!jobInfo || !jobInfo.deadline) {
                    await bot.sendMessage(
                        chatId,
                        "⚠️ Couldn't extract a valid deadline. Please try again.",
                    );
                    return;
                }
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
                        "⚠️ This job seems to be a duplicate and was not added.",
                    );
                    return;
                }
                const deadline = dayjs.tz(
                    jobInfo.deadline,
                    "DD/MM/YYYY HH:mm A",
                    TIMEZONE,
                );
                if (!deadline.isValid()) {
                    await bot.sendMessage(
                        chatId,
                        `❌ AI returned an unreadable date: "${jobInfo.deadline}".`,
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
                console.log(`✅ Job added for "${jobInfo.company}"`);
            } catch (err) {
                console.error("Bot 'message' event (job) error:", err);
                await bot.sendMessage(chatId, "❌ A critical error occurred.");
            }
        } else if (awaitingPlacedInfo.has(chatId)) {
            awaitingPlacedInfo.delete(chatId);

            if (userMessage.toLowerCase() === "exit") {
                bot.sendMessage(chatId, "Process ended.");
                return;
            }

            bot.sendMessage(
                chatId,
                "🧠 Got it! Extracting placed student info, please wait...",
            );
            try {
                const placedInfo = await extractPlacedInfo(userMessage);
                if (
                    !placedInfo ||
                    !placedInfo.company ||
                    placedInfo.student_names.length === 0
                ) {
                    await bot.sendMessage(
                        chatId,
                        "⚠️ Couldn't extract company or student names. Please try the /placed_add command again.",
                    );
                    return;
                }

                await db.collection("placed").add({
                    company: placedInfo.company,
                    student_names: placedInfo.student_names,
                    added_at: dayjs().toISOString(),
                });

                bot.sendMessage(
                    chatId,
                    `✅ Successfully added ${placedInfo.student_names.length} placed student(s) for ${placedInfo.company}.`,
                );
                console.log(`✅ Placed students added for "${placedInfo.company}"`);
            } catch (err) {
                console.error("Bot 'message' event (placed) error:", err);
                await bot.sendMessage(chatId, "❌ A critical error occurred.");
            }
        }
    });
}
