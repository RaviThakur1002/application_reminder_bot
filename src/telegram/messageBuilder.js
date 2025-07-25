// src/telegram/messageBuilder.js

/**
 * Escapes characters that have special meaning in Telegram's MarkdownV2.
 * @param {string} text The text to escape.
 * @returns {string} The escaped text.
 */
function escapeMarkdown(text) {
    if (typeof text !== "string") return "";
    return text.replace(/([\\_\*\[\]()~`>#+\-=|{}.!])/g, "\\$&");
}

/**
 * Builds the main job details message, hiding any fields that are null or empty.
 * @param {object} jobInfo The job information object.
 * @returns {string} The formatted message body.
 */
export function buildTelegramMessage(jobInfo) {
    const lines = [];
    const addLine = (label, value) => {
        if (value && value !== "null" && String(value).trim().length > 0) {
            const text = Array.isArray(value) ? value.join(", ") : value;
            lines.push(`${label} ${escapeMarkdown(text)}`);
        }
    };

    const addLink = (label, link) => {
        if (link && link !== "null") {
            const escapedLink = link.replace(/\)/g, "\\)");
            lines.push(`${label}[Link](${escapedLink})`);
        }
    };

    addLine("🏢 *Company*:", jobInfo.company);
    addLine("🧑‍💻 *Role*:", jobInfo.role);
    addLine("📍 *Location*:", jobInfo.location);
    addLine("💰 *CTC*:", jobInfo.ctc);
    addLine("💸 *Stipend*:", jobInfo.stipend);
    addLine("📈 *PPO CTC*:", jobInfo.ppo_ctc);
    addLine("🎓 *Eligible Degrees*:", jobInfo.eligible_degrees);
    addLine("🧑‍🔬 *Branches*:", jobInfo.eligible_branches);
    addLine("📊 *CGPA Criteria*:", jobInfo.cgpa_criteria);
    addLine("📆 *Deadline*:", jobInfo.deadline);

    const hasLinks =
        jobInfo.google_form_link ||
        jobInfo.announcement_group_link ||
        jobInfo.query_group_link;
    if (hasLinks) {
        lines.push("");
    }
    addLink("📝 *Google Form*:", jobInfo.google_form_link);
    addLink("📣 *Announcement Group*:", jobInfo.announcement_group_link);
    addLink("💬 *Query Group*:", jobInfo.query_group_link);

    if (
        jobInfo.job_description &&
        jobInfo.job_description !== "null" &&
        jobInfo.job_description.trim().length > 0
    ) {
        lines.push("");
        lines.push(`🗒 *Description*:\n${escapeMarkdown(jobInfo.job_description)}`);
    }

    return lines.join("\n");
}

/**
 * Formats remaining time in minutes into a human-readable "Xh Ym" string.
 * @param {number} minutes The total minutes remaining.
 * @returns {string} The formatted time string.
 */
export function formatRemainingTime(minutes) {
    if (minutes <= 0) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    let parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    return parts.join(" ");
}
