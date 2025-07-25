// src/telegram/commands.js

// Helper function to escape markdown characters
function escapeMarkdown(text) {
    if (typeof text !== "string") return "";
    return text.replace(/([\\_\*\[\]()~`>#+\-=|{}.!])/g, "\\$&");
}

// Now accepts the state map as an argument
export function initializeCommands(bot, db, awaitingJobInfo) {
    // --- NEW: /add command now starts a conversation ---
    bot.onText(/\/add/, (msg) => {
        const chatId = msg.chat.id;
        // Prompt the user for the job info
        bot.sendMessage(
            chatId,
            "Please paste the full job description now, or type `exit` to cancel.",
        );
        // Set the state for this chat, indicating we're waiting for the next message.
        awaitingJobInfo.set(chatId, true);
    });

    // --- Other commands remain the same ---
    bot.onText(/\/active/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db
            .collection("jobs")
            .where("closed", "==", false)
            .get();

        if (snapshot.empty) {
            bot.sendMessage(chatId, "No active job applications found.");
            return;
        }

        let response = `*Total Active Applications: ${snapshot.size}*\n\n`;
        let count = 1;
        snapshot.forEach((doc) => {
            response += `${count}\\. ${escapeMarkdown(doc.data().company)}\n`;
            count++;
        });

        bot.sendMessage(chatId, response, { parse_mode: "MarkdownV2" });
    });

    bot.onText(/\/closed/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db
            .collection("jobs")
            .where("closed", "==", true)
            .get();

        if (snapshot.empty) {
            bot.sendMessage(chatId, "No closed job applications found.");
            return;
        }

        let response = `*Total Closed Applications: ${snapshot.size}*\n\n`;
        let count = 1;
        snapshot.forEach((doc) => {
            response += `${count}\\. ${escapeMarkdown(doc.data().company)}\n`;
            count++;
        });

        bot.sendMessage(chatId, response, { parse_mode: "MarkdownV2" });
    });

    bot.onText(/\/total/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db.collection("jobs").get();
        bot.sendMessage(chatId, `*Total Jobs Tracked: ${snapshot.size}*`, {
            parse_mode: "MarkdownV2",
        });
    });
}
