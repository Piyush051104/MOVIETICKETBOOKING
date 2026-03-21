import express from "express";
import { getFavorites, getUserBookings, updateFavorite } from "../controllers/userController.js";
import { isAdminEmail } from '../controllers/userController.js'

const userRouter = express.Router();
userRouter.post('/is-admin-email', isAdminEmail)
userRouter.get('/bookings', getUserBookings)
userRouter.post('/update-favorite', updateFavorite)
userRouter.get('/favorites', getFavorites)

export default userRouter;