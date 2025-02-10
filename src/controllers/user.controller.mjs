import { asyncHandler } from "../utils/asyncHandler.mjs";
import {APiError} from "../utils/ApiError.mjs"
import { User } from "../models/user.model.mjs";
import {uploadOnCloudinary} from "../utils/fileUpload.mjs"
import { ApiResponse } from "../utils/ApiResponse.mjs";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessandRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        console.log(error.message)
        throw new APiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    const {fullName, username, email, password} = req.body

    if([fullName,username,email,password].some((fields)=> 
        fields?.trim() === "")){
            throw new APiError(400, false , "All fields are required")

    }

    const userExist = await User.findOne({
        $or: [{username}, {email}]
    })

    if(userExist){
        throw new APiError(409, "user with the email or password already exist")
    }

    // const avatarPathLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
       coverImageLocalPath = req.files.coverImage[0].path 
    }

    let avatarPathLocalPath
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarPathLocalPath = req.files.avatar[0].path 
    }
    else {
        throw new APiError(400, "Avatar file is required")
    }


    const avatar = await uploadOnCloudinary(avatarPathLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new APiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new APiError(500, "Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    const{username, email, password} = req.body;

    if(!username && !email){
        throw new APiError(400, "username or email is required")
    }
 
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new APiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new APiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessandRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {
        user: loggedInUser, accessToken, refreshToken
    }, 
    "User logged in successfully"))

})

const logOutUser = asyncHandler(async(req, res) => {
    await User.findOneAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
            
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logout Successfully"))

})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if(!incomingRefreshToken){
        throw new APiError(401, "Unauthorized request")
    }

    try {
        const decodeToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodeToken?._id)
    
        if(!user){
            throw new APiError(401, "Invalid refresh Token")
        }
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new APiError(401, "Refresh Token does not match")
        }
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        const {accessToken, NewrefreshToken} = await generateAccessandRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", NewrefreshToken, options)
        .json(
            new ApiResponse(
                200, {
                    accessToken, 
                    refreshToken:NewrefreshToken}, 
                "Access token refreshed successfully"))
    } catch (error) {
        throw new APiError(401, error?.message || "Invalid refresh Token")
    }
})

const changePassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    if(!oldPassword || !newPassword){
        throw new APiError(400, "All fields are required")
    }

    const user = await User.findById(req.user?._id)

    if(!user){
        throw new APiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid){
        throw new APiError(401, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {username, email} = req.body

    if(!username || !email){
        throw new APiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarlocalPath = req.file?.path

    if(!avatarlocalPath){
        throw new APiError(400, "Avatar is missing")
    }

    const avatar = await uploadOnCloudinary(avatarlocalPath)

    if(!avatar.url){
        throw new APiError(400, "Error while uploading avatar on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            user,
            "Avatar uploaded Successfully"
        )
    )

})


const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImagelocalPath = req.file?.path

    if(!coverImagelocalPath){
        throw new APiError(400, "coverImage is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImagelocalPath)

    if(!coverImage.url){
        throw new APiError(400, "Error while uploading avatar on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            user,
            "coverImage uploaded Successfully"
        )
    )

})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new APiError(404, "username is missing")
    }

    const channel = await User.aggregate([
        {
        $match: {
            username: username?.toLowerCase()
        }
    },
    {
        $lookup: {
            from: "Subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
        }
    },
    {
        $lookup: {
            from: "Subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
        }
    },
    {
        $addFields:{
            subscribersCount: {
                $size: "$subscribers"
            },
            channelsSubscribedToCount: {
                $size: "$subscribedTo"
            },
            isSubscribed: {
                $cond: {
                    $in: [req.user?._id, "$subscribers.subscriber"]
                },
                then: true,
                else: false
            }
        }
    },
    {
        $project: {
            fullName: 1,
            username:1,
            subscribersCount: 1,
            channelsSubscribedToCount:1,
            avatar:1,
            coverImage:1,
            email:1
        }
    }
])

if(!channel.length){
    throw new APiError(404, "Channel does not exit")
}

return res
.status(200)
.json(new ApiResponse(
    200, channel[0], "User channel fetched Successfully"
))
})

const getWatchHistory = asyncHandler(async(req, res) => {

    const user = await User.aggregate([
        {
            $match: new mongoose.Types.ObjectId(req.user._id)
        },
        {
            $lookup: {
                from: "Video",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "User",
                            localField: "owner",
                            foreignField: "_id",
                            as:"owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1

                                    }
                                }
                            ]

                        }
                    },
                    {
                       $addFields: {
                        owner: {
                            $first: "$owner"
                        }
                       }
                    }
                ]

            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            user[0].watchHistory, 
            "watchHistory fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}