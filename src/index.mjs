import dotenv from "dotenv"
import connectDB from "./db/db.mjs";

dotenv.config({
    path: "./env"
});

connectDB()