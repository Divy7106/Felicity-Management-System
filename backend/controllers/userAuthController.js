import { participant, user } from "../schema/userSchema/index.js"
import { getUserLogin } from "../auth/auth.js"

// Registers a new participant account and auto-logs them in
export const signup = async (req, res) => {
    try {
        const body = { ...req.body }
        if (!body.role) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Participation Id creation failed",
                error: "Role is required field"
            })
        }

        if (body.role === "Participant") {
            const {
                email,
                password,
                firstName,
                lastName,
                participantType,
                orgName,
                contactNumber,
                role,
            } = req.body

            const isExist = await user.findOne({ email })
            if (isExist) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: "User creation failed.",
                    error: "User already exist, with give email id."
                })
            }

            const newParticipant = new participant({
                email,
                password,
                firstName,
                lastName,
                participantType,
                orgName,
                contactNumber,
                role,
            })

            try {
                const saved = await newParticipant.save()
                await getUserLogin(participant, email, password, res, 0)
                return res.status(201).json({
                    msgType: "Success",
                    msg: "User created & Logged in succefully",
                    response: saved,
                    token: res.locals.authToken,
                })
            } catch (err) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: "User creation & Login failed",
                    error: err.message
                })
            }
        } else if (body.role === "Organizer" || body.role === "Admin") {
            return res.status(403).json({
                msgType: "Error",
                msg: "User creation failed",
                error: "Permission denied"
            })
        }

        return res.status(400).json({
            msgType: "Error",
            msg: "User creation failed",
            error: `Unsupported role or you don't have permissions: ${body.role}`,
        })
    } catch (err) {
        return res.status(400).json({
            msgType: "Error",
            msg: "User Creation or Login Failed.",
            error: err.message
        })
    }
}

// Authenticates user credentials and sets session cookie
export const login = async (req, res) => {
    try {
        const body = { ...req.body }
        const { email, password } = body
        await getUserLogin(user, email, password, res)
    } catch (err) {
        return res.status(400).json({
            msgType: "Error",
            msg: "User Login failed",
            error: err.message
        })
    }
}

// Clears session cookie to log out the current user
export const logout = (req, res) => {
    try {
        // Clear cookie if it exists (for same-origin requests)
        if (req.cookies.sessionId) {
            res.clearCookie("sessionId", {
                httpOnly: true,
                secure: process.env.COOKIE_SECURITY === "true",
                sameSite: process.env.COOKIE_SAME_SITE || "lax",
            })
        }
        // Always return success - client will clear localStorage token
        return res.status(200).json({
            msgType: "Success",
            msg: "LogOut operation Successful.",
            response: "User Logged out."
        })
    } catch (err) {
        return res.status(500).json({
            msgType: "Error",
            msg: "An Unknown Error Occured",
            error: "Internal Server Error."
        })
    }
}
