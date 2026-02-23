import { verifyToken } from "../auth/auth.js"
import user from "../schema/userSchema/userSchema.js"

async function isLoggedIn(req, res, next) {
    try {
        if(req.cookies.sessionId) {
            const userIds = verifyToken(req.cookies.sessionId)
            const userData = await user.findById(userIds.userId)

            if(!userData) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: "User doesn't exist",
                    error: "Invalid userId"
                })
            }

            req.userData = userData
            return next()
        } else {
            return res.status(400).json({
                msgType: "Error",
                msg: "Please Login.",
                error: "User is not logged in."
            })    
        }
    } catch(err) {
        return res.status(500).json({
            msgType: "Error",
            msg: "User LogIn failed.",
            error: err.message
        })
    }
}

export default isLoggedIn