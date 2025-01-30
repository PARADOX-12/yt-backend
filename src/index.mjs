import dotenv from "dotenv"
import connectDB from "./db/db.mjs";
import { app } from "./app.mjs";

dotenv.config({
    path: "./env"
});

connectDB()
.then(() => {
    app.listen(process.env.PORT||8000, () => {
        console.log(`Server running on port: ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("Database Connection Failed", err)
})