import { asyncHandler } from "../utils/asyncHandler.mjs";
import {APiError} from "../utils/ApiError.mjs"
import { User } from "../models/user.model.mjs";
import {uploadOnCloudinary} from "../utils/fileUpload.mjs"
import { ApiResponse } from "../utils/ApiResponse.mjs";

const registerUser = asyncHandler( async (req,res) => {
    const {fullName, username, email, password} = req.body

    if([fullName,username,email,password].some((fields)=> 
        fields?.trim() === "")){
            throw new APiError(400, "All fields are required")

    }

    const userExist = User.findOne({
        $or: [{username}, {email}]
    })

    if(userExist){
        throw new APiError(409, "user with the email or password already exist")
    }

    const avatarPathLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarPathLocalPath){
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

export {registerUser}