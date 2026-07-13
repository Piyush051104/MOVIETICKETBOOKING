import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const agentTools = [{
    functionDeclarations: [
        {
            name: "search_movies",
            description: "Search for movies.",
            parameters: {
                type: "OBJECT",
                properties: { query: { type: "STRING", description: "Query" } },
                required: ["query"]
            }
        }
    ]
}];

async function test() {
    try {
        const messages = [{ role: "user", parts: [{ text: "Search for Sci-Fi movies" }] }];
        
        const chatSession = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: messages,
            config: {
                systemInstruction: "You must use the search_movies tool.",
                tools: agentTools,
                temperature: 0.2,
            }
        });

        if (chatSession.functionCalls && chatSession.functionCalls.length > 0) {
            const functionCall = chatSession.functionCalls[0];
            console.log("Got function call. Raw parts:");
            console.log(JSON.stringify(chatSession.candidates[0].content.parts, null, 2));
            
            const followupResponse = await ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: [
                    ...messages,
                    { role: 'model', parts: chatSession.candidates[0].content.parts },
                    { role: 'user', parts: [{ functionResponse: { name: functionCall.name, response: { result: "some movies" } } }] }
                ],
                config: {
                    systemInstruction: "You are a movie bot.",
                    tools: agentTools,
                    temperature: 0.2,
                }
            });
            console.log("Success followup:", followupResponse.text);
        } else {
            console.log("No function call", chatSession.text);
        }
    } catch (error) {
        console.log("Error Status:", error.status);
        console.log("Error Message:", error.message);
    }
}
test();
