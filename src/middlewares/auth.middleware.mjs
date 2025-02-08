import { APiError } from "../utils/ApiError.mjs";
import { asyncHandler } from "../utils/asyncHandler.mjs";
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.mjs"


export const verifyJWT = asyncHandler(async(req, res, next) => {
  try {
      const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
  
      if(!token){
              throw new APiError(401, "Unauthorized request")
      }
  
      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
  
      const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
  
      if(!user){
          throw new APiError(401, "Invalid access Token")
      }
  
      req.user = user
  
      next()
  } catch (error) {
    
    throw new APiError(401, error?.message || "Invalid access Token" )
    
  }
})