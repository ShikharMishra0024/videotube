import mongoose, {Schema} from 'mongoose'

const videoSchema  = new Schema({
    videoFile: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String, // cloudinary url
        required: true
    },
    description: {
        type: String, // cloudinary url
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    view: {
        type:Number,
        default: 0
    },
    isPublished: {
         type: Boolean,
         required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }


}, {timestamps: true})

export const Video = mongoose.model("Video", videoSchema)