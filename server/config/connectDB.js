import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const e = await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected", e.connection.host);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

export default connectDB;