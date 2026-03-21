import express from "express";
import { getFavorites, getUserBookings, updateFavorite, isAdminEmail } from "../controllers/userController.js";
import { requireAuth } from '@clerk/express';

const userRouter = express.Router();

userRouter.get('/bookings', requireAuth(), getUserBookings)
userRouter.post('/update-favorite', requireAuth(), updateFavorite)
userRouter.get('/favorites', requireAuth(), getFavorites)
userRouter.post('/is-admin-email', isAdminEmail) // public - used for forgot password check

export default userRouter;