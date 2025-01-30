import mongoose from "mongoose";
import { DB_NAME } from "../constants.mjs";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONOGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected successfully: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.error("DB connection Failed", error)
        process.exit(1)
    }
}

export default connectDB