// src/firebase.js
import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!encodedKey) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT not found in environment variables.");
    process.exit(1);
}

let serviceAccount;
try {
    const decodedKey = Buffer.from(encodedKey, "base64").toString("utf-8");
    serviceAccount = JSON.parse(decodedKey);
    console.log("✅ Firebase credentials loaded from environment.");
} catch (err) {
    console.error("❌ Failed to decode or parse FIREBASE_SERVICE_ACCOUNT:", err);
    process.exit(1);
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export const db = admin.firestore();

