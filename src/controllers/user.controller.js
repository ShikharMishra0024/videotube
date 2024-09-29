import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong")
    }
}

const registerUser = asyncHandler(async (req, res) => {
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

    const { fullName, email, username, password } = req.body

    if (
        [fullName, email, username, password].some((field) => field?.trim === "")
    ) {
        throw new ApiError(400, "All fields required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required");
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    // console.log("local Path: ", avatarLocalPath);



    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // console.log("cloud url: ", avatar)

    // console.log("cloud url: ", coverImage)

    if (!avatar) {
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

    if (!createdUser) {
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

    const { username, email, password } = req.body
    // console.log(req.body);


    if ((!username && !email) || !password) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
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
            $set: { refreshToken: undefined }
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

const refreshAccessToken = asyncHandler(async (req, res) => {
    const oldRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!oldRefreshToken) {
        throw new ApiError(401, "Unauthorised reqest")
    }

    try {
        const decodedToken = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "invalid refresh token")
        }

        if (oldRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token used or expired")
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "access token refreshed")
            )
    } catch (error) {
        throw new ApiError(400, error?.message || "invalid  refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body



    const user = await User.findByIdAndUpdate(req?.user?._id)

    user.isPasswordCorrect(oldPassword)
    if (!oldPassword) {
        throw new ApiError(401, "old password is incorrect.")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "password changed successfully.")
        )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200,
                {user},
                "user fetched successfully.")
        )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "All fields required.")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                username, email, fullName
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, { user }, "user profile updated successfully.")
        )
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    // validate avatar file
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file if required.")
    }

    // upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new ApiError(500, "something went wrong")
    }

    // update avatar file
    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: avatar
        },
        {new: true}
    ).select("-password -refreshToken")

    // delete previous uploaded avatar
    const isDeleted = deleteFromCloudinary(req.user?.avatar)
    if (!isDeleted) {
        throw new ApiError(500, "Error while deleting avatar file from cloudinary.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {user}, "avatar file updated successfully.")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // validate avatar file
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath) {
        throw new ApiError(400, "coverImage file if required.")
    }

    // upload on cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage){
        throw new ApiError(500, "something went wrong")
    }

    // update coverImage file
    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: coverImage
        },
        {new: true}
    ).select("-password -refreshToken")

    // delete previous uploaded coverImage
    const isDeleted = deleteFromCloudinary(req.user?.avatar)
    if (!isDeleted) {
        throw new ApiError(500, "Error while deleting coverImage file from cloudinary.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {user}, "coverImage file updated successfully.")
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    // aggregate pipeline -> channel subscriber count, count channel subscribed to, am'i subscribed, 
    const { username } = req.params

    if(!username.trim()) {
        throw new ApiResponse(400, "username required")
    }


    const channel = await User.aggregate([ 
        {
            $match: username?.toLowerCase()
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {$size: "subscribers"},
                subscribedToCount: {$size: "subscribedTo"},
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "subscribers.subscriber"]}, 
                        than: true,
                        else: false
                    }                   
                }
            }
        },
        {
            $project: {
                username: 1,
                email: 1,
                fullName: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    if(!channel.length) {
        throw new ApiResponse(404, "channel does not exit")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                channel,
                "user channel fetched successfully"
            )
        )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const UserWatchHistory = await User.aggregate([
        {
            $match: req.user?._id
        },
        {
            $project: {watchHistory: 1}
        }
    ])

    return res 
        .status(200)
        .json(
            new ApiResponse(
                200,
                UserWatchHistory,
                "Watch history fetched successfully"
            )
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}