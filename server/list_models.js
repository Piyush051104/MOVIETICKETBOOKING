import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

async function test() {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.list();
        console.log("Models:");
        // wait, how to iterate over list response?
        for await (let model of response) {
            console.log(model.name);
        }
    } catch (error) {
        console.log("Error:", error);
    }
}
test();
