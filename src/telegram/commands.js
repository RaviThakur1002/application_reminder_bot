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
        let count = 1;
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

    bot.onText(/\/placed_add/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(
            chatId,
            "Please paste the placed students message now, or type `exit` to cancel.",
        );
        awaitingPlacedInfo.set(chatId, true);
    });

    bot.onText(/\/placed_total/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db.collection("placed").get();
        if (snapshot.empty) {
            bot.sendMessage(chatId, "No placed students have been recorded yet.");
            return;
        }
        let totalCount = 0;
        snapshot.forEach((doc) => {
            const names = Array.isArray(doc.data().student_names)
                ? doc.data().student_names
                : [];
            totalCount += names.length;
        });

        const initialText = `*Total Students Placed: ${totalCount}*`;
        const initialKeyboard = {
            inline_keyboard: [
                [
                    {
                        text: "View Details by Company",
                        callback_data: "view_companies_list",
                    },
                ],
            ],
        };

        bot.sendMessage(chatId, initialText, {
            parse_mode: "MarkdownV2",
            reply_markup: initialKeyboard,
        });
    });

    bot.onText(/\/placed_details/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db.collection("placed").get();
        if (snapshot.empty) {
            bot.sendMessage(chatId, "No placed students have been recorded yet.");
            return;
        }

        const companyMap = new Map();
        snapshot.forEach((doc) => {
            const data = doc.data();
            const names = Array.isArray(data.student_names) ? data.student_names : [];
            const existing = companyMap.get(data.company) || {
                names: [],
                data: data,
            };
            companyMap.set(data.company, {
                names: [...existing.names, ...names],
                data: data,
            });
        });

        let text = `*Total Companies with Placements: ${companyMap.size}*\n\nSelect a company to view details\\.`;
        const keyboard = [];
        for (const [company, info] of companyMap.entries()) {
            keyboard.push([
                {
                    text: `${company} (${info.names.length})`,
                    callback_data: `details_${company}`,
                },
            ]);
        }

        bot.sendMessage(chatId, text, {
            parse_mode: "MarkdownV2",
            reply_markup: { inline_keyboard: keyboard },
        });
    });

    bot.on("callback_query", async (callbackQuery) => {
        const msg = callbackQuery.message;
        const data = callbackQuery.data;
        const chatId = msg.chat.id;
        const messageId = msg.message_id;

        if (data === "view_companies_list") {
            const snapshot = await db.collection("placed").get();
            const companyMap = new Map();
            let totalCount = 0;
            snapshot.forEach((doc) => {
                const placedData = doc.data();
                const names = Array.isArray(placedData.student_names)
                    ? placedData.student_names
                    : [];
                totalCount += names.length;
                const existing = companyMap.get(placedData.company) || [];
                companyMap.set(placedData.company, [...existing, ...names]);
            });

            let text = `*Total Placed: ${totalCount}*\n\n`;
            for (const [company, names] of companyMap.entries()) {
                text += `*${escapeMarkdown(company)}* \\(${names.length}\\)\n`;
            }

            const keyboard = {
                inline_keyboard: [
                    [{ text: "⬅️ Go Back", callback_data: "view_total_count" }],
                ],
            };

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "MarkdownV2",
                reply_markup: keyboard,
            });
        } else if (data === "view_total_count") {
            const snapshot = await db.collection("placed").get();
            let totalCount = 0;
            snapshot.forEach((doc) => {
                const names = Array.isArray(doc.data().student_names)
                    ? doc.data().student_names
                    : [];
                totalCount += names.length;
            });
            const initialText = `*Total Students Placed: ${totalCount}*`;
            const initialKeyboard = {
                inline_keyboard: [
                    [
                        {
                            text: "View Details by Company",
                            callback_data: "view_companies_list",
                        },
                    ],
                ],
            };
            bot.editMessageText(initialText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "MarkdownV2",
                reply_markup: initialKeyboard,
            });
        } else if (data.startsWith("details_")) {
            const companyName = data.split("_")[1];

            const placedQuery = await db
                .collection("placed")
                .where("company", "==", companyName)
                .get();
            const jobQuery = await db
                .collection("jobs")
                .where("company", "==", companyName)
                .limit(1)
                .get();

            if (placedQuery.empty) {
                bot.answerCallbackQuery(callbackQuery.id, {
                    text: "Error: Placed data not found.",
                });
                return;
            }

            const allPlacedDocs = placedQuery.docs.map((doc) => doc.data());
            const jobData = !jobQuery.empty ? jobQuery.docs[0].data() : {};

            const companyData = {
                company: companyName,
                role: jobData.role || allPlacedDocs[0].role,
                ctc: jobData.ctc || allPlacedDocs[0].ctc,
                stipend: jobData.stipend || allPlacedDocs[0].stipend,
                student_names: [
                    ...new Set(allPlacedDocs.flatMap((d) => d.student_names || [])),
                ],
            };

            let text = `*Details for ${escapeMarkdown(companyData.company)}*\n\n`;
            if (companyData.role)
                text += `*Role:* ${escapeMarkdown(companyData.role)}\n`;
            if (companyData.ctc)
                text += `*CTC:* ${escapeMarkdown(companyData.ctc)}\n`;
            if (companyData.stipend)
                text += `*Stipend:* ${escapeMarkdown(companyData.stipend)}\n`;
            text += `\n*Placed Students \\(${companyData.student_names.length}\\):*\n`;
            companyData.student_names.forEach((name) => {
                text += `\\- ${escapeMarkdown(name)}\n`;
            });

            const keyboard = {
                inline_keyboard: [
                    [{ text: "⬅️ Go Back", callback_data: "back_to_details_list" }],
                ],
            };

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "MarkdownV2",
                reply_markup: keyboard,
            });
        } else if (data === "back_to_details_list") {
            const snapshot = await db.collection("placed").get();
            const companyMap = new Map();
            snapshot.forEach((doc) => {
                const data = doc.data();
                const names = Array.isArray(data.student_names)
                    ? data.student_names
                    : [];
                const existing = companyMap.get(data.company) || {
                    names: [],
                    data: data,
                };
                companyMap.set(data.company, {
                    names: [...existing.names, ...names],
                    data: data,
                });
            });
            let text = `*Total Companies with Placements: ${companyMap.size}*\n\nSelect a company to view details\\.`;
            const keyboard = [];
            for (const [company, info] of companyMap.entries()) {
                keyboard.push([
                    {
                        text: `${company} (${info.names.length})`,
                        callback_data: `details_${company}`,
                    },
                ]);
            }
            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "MarkdownV2",
                reply_markup: { inline_keyboard: keyboard },
            });
        }

        bot.answerCallbackQuery(callbackQuery.id);
    });
}
