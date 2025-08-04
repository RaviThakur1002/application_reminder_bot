function escapeMarkdown(text) {
    if (typeof text !== "string") return "";
    return text.replace(/([\\_\*\[\]()~`>#+\-=|{}.!])/g, "\\$&");
}

export function initializeCommands(
    bot,
    db,
    awaitingJobInfo,
    awaitingPlacedInfo,
) {
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
        const sortedJobs = snapshot.docs.sort(
            (a, b) =>
                a.data().deadline_timestamp.toMillis() -
                b.data().deadline_timestamp.toMillis(),
        );
        sortedJobs.forEach((doc, index) => {
            const job = doc.data();
            response += `${index + 1}\\. ${escapeMarkdown(job.company)} \\- _${escapeMarkdown(job.deadline)}_\n`;
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
        snapshot.forEach((doc, index) => {
            response += `${index + 1}\\. ${escapeMarkdown(doc.data().company)}\n`;
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
        snapshot.forEach((doc, index) => {
            response += `${index + 1}\\. ${escapeMarkdown(doc.data().company)}\n`;
        });
        bot.sendMessage(chatId, response, { parse_mode: "MarkdownV2" });
    });

    bot.onText(/\/add_placed/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(
            chatId,
            "Please paste the placed students message now, or type `exit` to cancel.",
        );
        awaitingPlacedInfo.set(chatId, true);
    });

    bot.onText(/\/total_placed/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db.collection("placed").get();
        if (snapshot.empty) {
            bot.sendMessage(chatId, "No placed students have been recorded yet.");
            return;
        }
        let totalCount = 0;
        snapshot.forEach((doc) => {
            totalCount += doc.data().student_names.length;
        });
        bot.sendMessage(chatId, `*Total Students Placed: ${totalCount}*`, {
            parse_mode: "MarkdownV2",
        });
    });

    bot.onText(/\/total_placed_name/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db.collection("placed").get();
        if (snapshot.empty) {
            bot.sendMessage(chatId, "No placed students have been recorded yet.");
            return;
        }

        const companyMap = new Map();
        let totalCount = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();
            totalCount += data.student_names.length;
            const existing = companyMap.get(data.company) || [];
            companyMap.set(data.company, [...existing, ...data.student_names]);
        });

        let response = `*Total Placed: ${totalCount}*\n\n`;
        for (const [company, names] of companyMap.entries()) {
            response += `*${escapeMarkdown(company)} \\(${names.length}\\):*\n`;
            names.forEach((name) => {
                response += `\\- ${escapeMarkdown(name)}\n`;
            });
            response += "\n";
        }

        bot.sendMessage(chatId, response, { parse_mode: "MarkdownV2" });
    });
}
