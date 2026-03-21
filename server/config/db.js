import mongoose, { connect } from "mongoose";

const connectDB = async() =>{
    try{
        mongoose.connection.on('connected',() => console.log('Database connected'));
        await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`, {
            serverSelectionTimeoutMS: 30000, // 30 seconds timeout
            socketTimeoutMS: 45000,
            family: 4, // Force IPv4 - fixes hotspot issues
        })
    }catch(error){
        console.log(error.message)
    }
}

export default connectDB;