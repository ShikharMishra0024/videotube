import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"


// get cookie from req
// decode jwt using acces_token_secret
// get user details
// remove user refreshToken from db

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.Cookie?.accessToken 
        // || req.header?.authorization.replace("Bearer ", "")
        console.log(req.Cookie);
        
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if (!user) {
            throw new ApiError(401, "Invalid access token")
        }

        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error || "invalid access token")
    }
})