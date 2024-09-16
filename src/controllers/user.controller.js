import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {User} from "../models/user.model.js"

const registerUser = asyncHandler( async (req, res) => {
    // user details from frontend
    // validate../
    // check for existed user, username, email
    // avatar aur coverimage(optional) ka filepath -> validate
    // upload on cloudinary
    // get cloudinary url
    // create user in db
    // remove access token and refresh token field from reponse
    // check for user creation
    // return res

    const {fullName, email, username, password} = req.body

    if (
        [fileName, email, username, password].some((field) => field?.trim === "")
    ){
        throw new ApiError(400, "All fields required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required");
    }

    let coverimageLocalPath;
    if(req.files && Array.isArray(req.coverImage) && req.files.coverImage.length > 0){
        coverimageLocalPath = req.files.coverImage[0].path;
    }

    const  avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverimageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar is required")
    }

    const user = await User.create({
        fullName, 
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering th user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )




})

export  { 
    registerUser, 
}