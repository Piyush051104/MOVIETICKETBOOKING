import { clerkClient } from "@clerk/express";
import Booking from "../model/Booking.js";
import Movie from "../model/Movie.js";

// API Controller Function to Get User Bookings
export const getUserBookings = async (req, res) => {
    try {
        const user = req.auth().userId;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized." })
        }

        const bookings = await Booking.find({ user }).populate({
            path: "show",
            populate: { path: "movie" }
        }).sort({ createdAt: -1 })

        res.status(200).json({ success: true, bookings })
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API Controller Function to update Favorite Movie in Clerk User Metadata
export const updateFavorite = async (req, res) => {
    try {
        const { movieId } = req.body;
        const userId = req.auth().userId;

        if (!movieId) {
            return res.status(400).json({ success: false, message: "movieId is required." })
        }

        const user = await clerkClient.users.getUser(userId)

        if (!user.privateMetadata.favorites) {
            user.privateMetadata.favorites = []
        }

        if (!user.privateMetadata.favorites.includes(movieId)) {
            user.privateMetadata.favorites.push(movieId)
        } else {
            user.privateMetadata.favorites = user.privateMetadata.favorites.filter(item => item !== movieId)
        }

        await clerkClient.users.updateUserMetadata(userId, { privateMetadata: user.privateMetadata })

        res.status(200).json({ success: true, message: "Favorite movies updated" })
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

export const getFavorites = async (req, res) => {
    try {
        const user = await clerkClient.users.getUser(req.auth().userId)
        const favorites = user.privateMetadata.favorites || []
        const movies = await Movie.find({ _id: { $in: favorites } })
        res.status(200).json({ success: true, movies })
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}

// Check if email belongs to an admin — used for forgot password flow
export const isAdminEmail = async (req, res) => {
    try {
        const { email } = req.body

        if (!email) {
            return res.status(400).json({ isAdmin: false, message: "Email is required." })
        }

        const userList = await clerkClient.users.getUserList()
        const user = userList.data.find(u =>
            u.emailAddresses.some(e => e.emailAddress === email)
        )

        if (!user) {
            return res.status(404).json({ isAdmin: false })
        }

        const isAdmin = user.privateMetadata?.role === 'admin'
        res.status(200).json({ isAdmin })

    } catch (error) {
        console.error(error)
        res.status(500).json({ isAdmin: false })
    }
}