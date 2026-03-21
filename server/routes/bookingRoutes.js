import express from 'express';
import { createBooking, getOccupiedSeats } from '../controllers/bookingController.js';
import { requireAuth } from '@clerk/express';

const bookingRouter = express.Router();

// requireAuth() ensures only logged in users can book
bookingRouter.post('/create', requireAuth(), createBooking);
bookingRouter.get('/seats/:showId', requireAuth(), getOccupiedSeats);

export default bookingRouter;