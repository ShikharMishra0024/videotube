import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        // upload the file
        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" })
        console.log("file has been successfully uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) { // if file uploading failed
        fs.unlinkSync(localFilePath) // removes the locally saved temporary file
        return null
    }
}

const deleteFromCloudinary = async (cloudinaryUrl) => {
    try {
        if (!cloudinaryUrl) return null

        const response = await cloudinary.uploader.destroy(cloudinaryUrl.split("/")[word.length-1]);
        console.log("file has been successfully deleted on cloudinary", response);
        return response
    } catch (error) {
        console.log("cloudinary file deletion failed")
        return null
    }
}


export { 
    uploadOnCloudinary,
    deleteFromCloudinary
 }