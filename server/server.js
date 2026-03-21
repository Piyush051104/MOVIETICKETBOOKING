import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"
import showRouter from './routes/showRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import userRouter from './routes/userRoutes.js';
import { stripeWebhooks } from './controllers/stripeWebhooks.js';
import { initSocket } from './socket.js';

const app = express();
const port = 3000;

// Create HTTP server and Socket.io server
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: [
            'http://localhost:5173',
            'https://movieticketbooking-fro.vercel.app',
            'https://movieticketbooking-chi.vercel.app',
            process.env.CLIENT_URL
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
})

// Initialize socket events
initSocket(io)

await connectDB()

// Stripe Webhooks Route (must be before express.json())
app.use('/api/stripe', express.raw({type: 'application/json'}), stripeWebhooks)

// Middleware
app.use(express.json())
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://movieticketbooking-fro.vercel.app',
        'https://movieticketbooking-chi.vercel.app',
        process.env.CLIENT_URL
    ],
    credentials: true
}))
app.use(clerkMiddleware())

// API Routes
app.get('/', (req, res) => res.send('Server is Live!'))
app.use('/api/inngest', serve({ client: inngest, functions }))
app.use('/api/show', showRouter)
app.use('/api/booking', bookingRouter)
app.use('/api/admin', adminRouter)
app.use('/api/user', userRouter)

// Use httpServer instead of app.listen
httpServer.listen(port, () => console.log(`Server listening at http://localhost:${port}`));