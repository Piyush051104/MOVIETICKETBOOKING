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

// Allow all vercel.app subdomains + localhost
const corsOptions = {
    origin: (origin, callback) => {
        if (
            !origin ||
            origin === 'http://localhost:5173' ||
            origin.endsWith('.vercel.app') ||
            origin === process.env.CLIENT_URL
        ) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    credentials: true
}

// Create HTTP server and Socket.io server
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (
                !origin ||
                origin === 'http://localhost:5173' ||
                origin.endsWith('.vercel.app') ||
                origin === process.env.CLIENT_URL
            ) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        },
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
app.use(cors(corsOptions))
app.use(clerkMiddleware())

// API Routes
app.get('/', (req, res) => res.send('Server is Live!'))
app.use('/api/inngest', serve({ client: inngest, functions }))
app.use('/api/show', showRouter)
app.use('/api/booking', bookingRouter)
app.use('/api/admin', adminRouter)
app.use('/api/user', userRouter)

httpServer.listen(port, () => console.log(`Server listening at http://localhost:${port}`));