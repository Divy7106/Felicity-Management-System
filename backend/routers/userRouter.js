import express from "express"
import {
    getUserInfo,
    editProfile,
    changePassword,
    editPreference,
    requestPasswordReset,
    getPasswordResetStatus,
} from "../controllers/userController.js"

const userRouter = express.Router()

userRouter.get("/get-info", getUserInfo)
userRouter.put("/edit-profile", editProfile)
userRouter.put("/change-password", changePassword)
userRouter.post("/edit-preference", editPreference)
userRouter.post("/request-password-reset", requestPasswordReset)
userRouter.get("/password-reset-status", getPasswordResetStatus)

export default userRouter