import { GoogleGenAI } from '@google/genai';
import Movie from '../model/Movie.js';
import Show from '../model/Show.js';
import Booking from '../model/Booking.js';
import redis from '../config/redis.js';
import stripe from 'stripe';
import { inngest } from '../inngest/index.js';

// Initialize the Gemini API client using the key from .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// System prompt gives the agent its identity and constraints
const SYSTEM_PROMPT = `
You are CineBot, a highly helpful VIP movie booking assistant.
Your job is to help users find movies, check seat availability, and book tickets.
You have access to several tools. When a user asks a question, use the tools to find the exact, real-time data from the database.
Always be polite, concise, and helpful. Do not hallucinate movies that aren't in the database.
`;

/**
 * Tool 2: Get Show Times
 */
async function getShowTimes(movieId) {
    try {
        const shows = await Show.find({movie: movieId, showDateTime: { $gte: new Date() }}).sort({showDateTime: 1});
        const formatted = shows.map(s => ({ showId: s._id, time: s.showDateTime }));
        return JSON.stringify(formatted);
    } catch (e) {
        return JSON.stringify({ error: "Failed to fetch shows." });
    }
}

/**
 * Tool 3: Get Available Seats
 */
async function getAvailableSeats(showId) {
    try {
        const show = await Show.findById(showId);
        if (!show) return JSON.stringify({ error: "Show not found" });

        const occupied = Object.keys(show.occupiedSeats || {});
        
        // Also check redis for currently locked seats
        const keys = await redis.keys(`lock:${showId}:*`);
        const locked = keys.map(k => k.split(':')[2]);

        const unavailable = [...new Set([...occupied, ...locked])];
        return JSON.stringify({ 
            unavailableSeats: unavailable, 
            message: `Any seat A1-J10 not in this list is available.` 
        });
    } catch (e) {
        return JSON.stringify({ error: "Failed to fetch seats." });
    }
}

/**
 * Tool 1: Search Movies
 * This tool allows the AI to search the database for movies by genre or title.
 */
async function searchMovies(query) {
    try {
        // First get all upcoming shows to only return movies that are actually playing
        const upcomingShows = await Show.find({ showDateTime: { $gte: new Date() } }).populate('movie');
        
        // Extract unique movies from these shows
        const uniqueMoviesMap = new Map();
        upcomingShows.forEach(show => {
            if (show.movie) {
                uniqueMoviesMap.set(show.movie._id.toString(), show.movie);
            }
        });
        
        let activeMovies = Array.from(uniqueMoviesMap.values());

        // Apply text filter if a specific query is provided
        if (query && query.toLowerCase() !== 'all' && query.toLowerCase() !== 'any' && query.trim() !== '') {
            const regex = new RegExp(query, 'i');
            activeMovies = activeMovies.filter(m => regex.test(m.title) || (m.genre && regex.test(m.genre)));
        }

        // Format and return top 5
        const result = activeMovies.slice(0, 5).map(m => ({
            id: m._id,
            title: m.title,
            genre: m.genre || "Unknown",
            duration: m.runtime
        }));
        
        return JSON.stringify(result);
    } catch (error) {
        return JSON.stringify({ error: "Failed to search movies." });
    }
}

/**
 * Tool 4: Book Tickets
 */
async function bookTickets({ showId, seats, userId, origin }) {
    try {
        if (!userId) return JSON.stringify({ error: "User is not logged in. Ask them to log in first." });
        
        // 1. Lock seats in DB
        const seatUpdates = {};
        const seatConditions = {};
        seats.forEach(seat => {
            seatUpdates[`occupiedSeats.${seat}`] = userId;
            seatConditions[`occupiedSeats.${seat}`] = { $exists: false };
        });

        const updatedShow = await Show.findOneAndUpdate(
            { _id: showId, ...seatConditions },
            { $set: seatUpdates },
            { new: true }
        ).populate('movie');

        if (!updatedShow) {
            return JSON.stringify({ error: "One or more selected seats were already booked. Please ask the user to pick different seats." });
        }

        // 2. Create Booking record
        const booking = await Booking.create({
            user: userId,
            show: showId,
            amount: updatedShow.showPrice * seats.length,
            bookedSeats: seats
        });

        // 3. Generate Stripe Session
        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-bookings`,
            cancel_url: `${origin}/my-bookings`,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: updatedShow.movie.title },
                    unit_amount: Math.floor(booking.amount) * 100
                },
                quantity: 1
            }],
            mode: 'payment',
            metadata: { bookingId: booking._id.toString() },
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        });

        booking.paymentLink = session.url;
        await booking.save();

        await inngest.send({
            name: "app/checkpayment",
            data: { bookingId: booking._id.toString() }
        });

        return JSON.stringify({ 
            success: true, 
            message: "Successfully generated checkout link. Present this EXACT link to the user so they can pay.", 
            paymentUrl: session.url 
        });

        console.error("Booking Error from AI:", e);
        return JSON.stringify({ error: `Failed to create booking or Stripe session. Exact error: ${e.message}` });
    }
}

// Map the tool function names to actual javascript functions
const availableFunctions = {
    "search_movies": searchMovies,
    "get_show_times": getShowTimes,
    "get_available_seats": getAvailableSeats,
    "book_tickets": bookTickets
};

// Define the tool schemas for Gemini
const agentTools = [{
    functionDeclarations: [
        {
            name: "get_show_times",
            description: "Get all upcoming show dates and times for a specific movie.",
            parameters: {
                type: "OBJECT",
                properties: {
                    movieId: { type: "STRING", description: "The ID of the movie." }
                },
                required: ["movieId"]
            }
        },
        {
            name: "get_available_seats",
            description: "Check which seats are currently unavailable (booked or locked) for a specific show. Seats are arranged from A1 to J10.",
            parameters: {
                type: "OBJECT",
                properties: {
                    showId: { type: "STRING", description: "The ID of the show." }
                },
                required: ["showId"]
            }
        },
        {
            name: "search_movies",
            description: "Search for movies currently playing in theaters by title or genre. If the user asks for 'all movies' or doesn't specify a genre, pass an empty string '' as the query.",
            parameters: {
                type: "OBJECT",
                properties: {
                    query: {
                        type: "STRING",
                        description: "The search query (e.g., 'Sci-Fi', 'Inception', or '' for all movies)"
                    }
                },
                required: ["query"]
            }
        },
        {
            name: "book_tickets",
            description: "Locks the requested seats for a user and generates a Stripe checkout link. You must ask the user for the specific seats they want before calling this.",
            parameters: {
                type: "OBJECT",
                properties: {
                    showId: { type: "STRING", description: "The ID of the show." },
                    seats: { 
                        type: "ARRAY", 
                        items: { type: "STRING" }, 
                        description: "List of seat IDs to book (e.g., ['A1', 'A2'])" 
                    }
                },
                required: ["showId", "seats"]
            }
        }
    ]
}];

/**
 * Main Controller function that handles the chat request
 */
export const handleAgentChat = async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Add the user's new message to the history
        const messages = [...conversationHistory, { role: "user", parts: [{ text: message }] }];

        // We use gemini-flash-lite-latest because it has the highest free tier quota available
        const chatSession = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: messages,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                tools: agentTools,
                temperature: 0.2, // Low temperature so it doesn't hallucinate
            }
        });

        let currentResponse = chatSession;
        let responseMessage = currentResponse.text;
        let currentMessages = [...messages];
        let maxTurns = 5; // Prevent infinite loops

        // This is the ReAct loop: Keep checking if the AI decided to call a function
        while (currentResponse.functionCalls && currentResponse.functionCalls.length > 0 && maxTurns > 0) {
            const functionCall = currentResponse.functionCalls[0];
            const functionName = functionCall.name;
            const functionArgs = functionCall.args || {};
            
            console.log(`Agent is calling tool: ${functionName} with args:`, functionArgs);

            // Execute the backend function
            if (availableFunctions[functionName]) {
                // Pass the specific argument based on the tool
                let arg;
                if (functionName === 'search_movies') arg = functionArgs.query;
                else if (functionName === 'get_show_times') arg = functionArgs.movieId;
                else if (functionName === 'get_available_seats') arg = functionArgs.showId;
                else if (functionName === 'book_tickets') {
                    // Extract auth and origin from the express request
                    const userId = req.auth ? req.auth().userId : null;
                    const origin = req.headers.origin || 'http://localhost:5173';
                    arg = { showId: functionArgs.showId, seats: functionArgs.seats, userId, origin };
                }

                const apiResponse = await availableFunctions[functionName](arg);
                
                // Parse the stringified response back to an object so the SDK doesn't complain
                let parsedResponse = JSON.parse(apiResponse);
                
                // Gemini functionResponse requires an object, not an array. If it's an array, wrap it.
                if (Array.isArray(parsedResponse) || typeof parsedResponse !== 'object') {
                    parsedResponse = { result: parsedResponse };
                }

                // Append the history so the AI remembers its thought process
                currentMessages.push({ role: 'model', parts: currentResponse.candidates[0].content.parts });
                currentMessages.push({ role: 'user', parts: [{ functionResponse: { name: functionName, response: parsedResponse } }] });

                // Send the result back to Gemini so it can read it and formulate a final answer (or another function call)
                currentResponse = await ai.models.generateContent({
                    model: 'gemini-flash-lite-latest',
                    contents: currentMessages,
                    config: {
                        systemInstruction: SYSTEM_PROMPT,
                        tools: agentTools,
                        temperature: 0.2,
                    }
                });

                responseMessage = currentResponse.text;
            } else {
                break; // Break loop if function doesn't exist
            }
            maxTurns--;
        }

        return res.status(200).json({
            reply: responseMessage,
            history: [
                ...messages,
                { role: "model", parts: [{ text: responseMessage }] }
            ]
        });

    } catch (error) {
        console.error("Agent Error:", error);
        res.status(500).json({ error: `Agent Error: ${error.message}` });
    }
};
