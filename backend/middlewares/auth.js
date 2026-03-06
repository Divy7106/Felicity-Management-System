import { verifyToken } from "../auth/auth.js"
import user from "../schema/userSchema/userSchema.js"

async function isLoggedIn(req, res, next) {
    try {
        // Accept token from cookie OR Authorization header
        let token = req.cookies.sessionId
        if (!token) {
            const authHeader = req.headers.authorization
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1]
            }
        }

        if(token) {
            const userIds = verifyToken(token)
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