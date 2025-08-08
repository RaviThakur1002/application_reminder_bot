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
            description: "Format as 'DD/MM/YYYY HH:mm A'. Ex: '25/07/2025 11:59 PM'.",
        },
        application_link: { type: "STRING" },
        google_form_link: { type: "STRING" },
        announcement_group_link: { type: "STRING" },
        query_group_link: { type: "STRING" },
        job_description: { type: "STRING" },
    },
    required: ["company", "deadline"],
};

const placedInfoSchema = {
    type: "OBJECT",
    properties: {
        company: { type: "STRING", description: "The name of the company." },
        role: {
            type: "STRING",
            description:
                "The role the students were placed in (e.g., PPO Conversion, SDE Intern).",
        },
        ctc: { type: "STRING", description: "The CTC offered, if mentioned." },
        stipend: {
            type: "STRING",
            description: "The stipend offered, if mentioned.",
        },
        student_names: {
            type: "ARRAY",
            description:
                "An array of student names. IMPORTANT: Exclude any roll numbers or other details, just the names.",
            items: { type: "STRING" },
        },
    },
    required: ["company", "student_names"],
};

const jobModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: jobInfoSchema,
    },
});

const placedModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: placedInfoSchema,
    },
});

export async function extractJobInfo(message) {
    const prompt = `Task: Extract structured job information from the message below. The current date is ${new Date().toDateString()}. If info is not present, use null.\n\nMessage:\n"""${message}"""`;
    try {
        const result = await jobModel.generateContent(prompt);
        const response = result.response;
        return JSON.parse(response.text());
    } catch (err) {
        console.error("❌ Failed to extract job info:", err);
        return null;
    }
}

export async function extractPlacedInfo(message) {
    const prompt = `Task: From the message below, extract the company name, the role, any CTC or stipend info, and a list of student names. Ignore roll numbers and any other text.\n\nMessage:\n"""${message}"""`;
    try {
        const result = await placedModel.generateContent(prompt);
        const response = result.response;
        return JSON.parse(response.text());
    } catch (err) {
        console.error("❌ Failed to extract placed info:", err);
        return null;
    }
}
