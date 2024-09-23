import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {User} from "../models/user.model.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong")
    }
}

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
        [fullName, email, username, password].some((field) => field?.trim === "")
    ){
        throw new ApiError(400, "All fields required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if (existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required");
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    
    const  avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar is required")
    }

    const user = await User.create({
        fullName, 
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
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

const loginUser = asyncHandler(async (req, res) => {
    // check for access token to login user
    // check for refresh token and validate user
    //              OR
    // get username/email and password
    // check if user exist and match password
    // send access and refresh token in cookie
    // if new user redirect to user registration

    const {username, email, password} = req.body
    // console.log(req.body);
    

    if ((!username && !email) || !password){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user){
        throw new ApiError(404, "user does not exist")
    }
    
    const validateUser = await user.isPasswordCorrect(password)
    if (!validateUser) {
        throw new ApiError(401, "invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")
    // console.log(loggedInUser);
    

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    // find user
    // set refreshToken to undifined
    // 
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {refreshToken: undefined}
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out")
    )
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const oldRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!oldRefreshToken){
        throw new ApiError(401, "Unauthorised reqest")
    }

    const decodedToken = jwt.verify(oldRefreshToken, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id)

    if(!user){
        throw new ApiError(401, "invalid refresh token")
    }

    if (oldRefreshToken !== user.refreshToken){
        throw new ApiError(401, "refresh token used or expired")
    }

    const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)

    const options = {
        httpOnly: "true",
        secure: "true"
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "access token refreshed")
    )
})

export  { 
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken
}