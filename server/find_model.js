import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

async function findWorkingModel() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // We will test a few common lightweight models
    const modelsToTest = [
        'gemini-2.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-2.0-flash-lite-001',
        'gemini-flash-latest',
        'gemini-pro-latest',
        'gemini-3.5-flash',
        'gemma-4-26b-a4b-it'
    ];

    for (const model of modelsToTest) {
        console.log(`Testing ${model}...`);
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: "Hello"
            });
            console.log(`SUCCESS: ${model} works! Response: ${response.text}`);
            return; // Stop as soon as we find one that works
        } catch (error) {
            console.log(`FAILED: ${model} - ${error.status || error.message}`);
        }
    }
    console.log("No working models found on Free Tier.");
}

findWorkingModel();
