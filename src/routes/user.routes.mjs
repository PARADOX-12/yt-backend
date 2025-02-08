import { Router } from "express";
import { registerUser, loginUser, logOutUser, refreshAccessToken } from "../controllers/user.controller.mjs";
import {upload} from "../middlewares/multer.middleware.mjs"
import { verifyJWT } from "../middlewares/auth.middleware.mjs";

const router = Router()


router.route("/register").post(
    upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
    ]),
    registerUser

)

router.route("/login").post(loginUser)

//Secure Route
router.route("/logout").post(verifyJWT ,logOutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router

