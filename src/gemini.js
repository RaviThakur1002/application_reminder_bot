import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const jobInfoSchema = {
    type: "OBJECT",
    properties: {
        company: { type: "STRING" },
        role: { type: "STRING" },
        location: { type: "STRING" },
        ctc: { type: "STRING" },
        stipend: { type: "STRING" },
        ppo_ctc: { type: "STRING" },
        eligible_degrees: { type: "ARRAY", items: { type: "STRING" } },
        eligible_branches: { type: "ARRAY", items: { type: "STRING" } },
        cgpa_criteria: { type: "STRING" },

        deadline: {
            type: "STRING",
            description:
                "The application deadline. IMPORTANT: Format this as 'DD/MM/YYYY HH:mm A'. Example: '25/07/2025 11:59 PM'.",
        },
        google_form_link: { type: "STRING" },
        announcement_group_link: { type: "STRING" },
        query_group_link: { type: "STRING" },
        job_description: { type: "STRING" },
    },

    required: ["company", "deadline"],
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: jobInfoSchema,
    },
});

export async function extractJobInfo(message) {
    const prompt = `
Task: Extract structured job information from the provided placement message according to the JSON schema.
- The current date is ${new Date().toDateString()}. Use this for relative dates like "tomorrow".
- If any information is not present in the message, its value should be null.

Message:
"""${message}"""
`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const jsonObject = JSON.parse(response.text());
        return jsonObject;
    } catch (err) {
        return null;
    }
}
