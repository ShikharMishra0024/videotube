import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log('Connection Successful, host is ', connectionInstance.connection.host)
        // console.log(connectionInstance)
    } catch (error) {
        console.log("database connection failed " , error);
        process.exit(1);
    }
}

export default connectDB;