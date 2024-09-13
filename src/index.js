import dotenv from 'dotenv';
import connectDB from './db/index.js';
import express from 'express'
dotenv.config()

const app = express()

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("ERROR: ", error);
            throw error
        })
        app.listen(process.env.PORT || 8000, () => {
            console.log(`server is running in port: ${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.log("MONGO db connection failed", err)
    })