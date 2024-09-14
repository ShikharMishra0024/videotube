import mongoose, {Schema, trusted} from 'mongoose';

const userSchema = new Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true // optimize for searching, field is frequently searched
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    FullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String, // cloudinary url
        required: true
    },
    coverimage: {
        type: String, // cloudinary url
    },
    watchHistory: [
        {
            type: Schema.Type.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, "'Password is required"]
    },
    refreshToken: {
        type: String
    },

}, {timestamps: true})

export const User = mongoose.model("User", userSchema)