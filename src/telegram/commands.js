function escapeMarkdown(text) {
    if (typeof text !== "string") return "";
    return text.replace(/([\\_\*\[\]()~`>#+\-=|{}.!])/g, "\\$&");
}

export function initializeCommands(bot, db, awaitingJobInfo) {
    bot.onText(/\/add/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(
            chatId,
            "Please paste the full job description now, or type `exit` to cancel.",
        );
        awaitingJobInfo.set(chatId, true);
    });

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
        const sortedJobs = snapshot.docs.sort((a, b) => {
            return (
                a.data().deadline_timestamp.toMillis() -
                b.data().deadline_timestamp.toMillis()
            );
        });

        sortedJobs.forEach((doc) => {
            const job = doc.data();

            response += `${count}\\. ${escapeMarkdown(job.company)} \\- _${escapeMarkdown(job.deadline)}_\n`;
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

        if (snapshot.empty) {
            bot.sendMessage(chatId, "No jobs have been tracked yet.");
            return;
        }

        let response = `*Total Jobs Tracked: ${snapshot.size}*\n\n`;
        let count = 1;
        snapshot.forEach((doc) => {
            response += `${count}\\. ${escapeMarkdown(doc.data().company)}\n`;
            count++;
        });

        bot.sendMessage(chatId, response, { parse_mode: "MarkdownV2" });
    });
}
