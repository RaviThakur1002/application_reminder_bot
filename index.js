import express from "express";
import runBot from "./src/bot.js";

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (_, res) => res.send("🤖 Bot is running!"));

runBot();

app.listen(port, () => {
    console.log(`Dummy server listening on port ${port}`);
});
