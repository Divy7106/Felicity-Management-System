import { Router } from "express";
import { participant, admin, user } from "../schema/userSchema/index.js";
import {  getUserLogin } from "../auth/auth.js";

const userAuthRouter = Router()

// PARTICIPANT SIGN UP :
userAuthRouter.post('/signup', async (req, res) => {
    try {
        const body = {... req.body}
        if(!body.role) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Participation Id creation failed",
                error: "Role is required field"
            })
        }

        if(body.role === "Participant") {

            const {
            email,
            password,
            firstName,
            lastName,
            participantType,
            orgName,
            contactNumber,
            role,
            } = req.body;

            const isExist = await user.findOne({email})
            if(isExist) {
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
                })
            } catch (err) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: "User creation & Login failed",
                    error: err.message
                })
            }
        } else if(body.role === 'Organizer' || body.role === 'Admin') {
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
        
    }catch(err) {
        return res.status(400).json({
            msgType: "Error",
            msg: "User Creation or Login Failed.",
            error: err.message
        })
    }
})

// USER LOGIN :
userAuthRouter.post('/login', async (req, res) => {
    try {
        const body = {... req.body}

        const {
            email,
            password,
        } = body

        await getUserLogin(user, email, password, res)
    }catch(err) {
        return res.status(400).json({
            msgType: "Error",
            msg: "User Login failed",
            error: err.message
        })
    }
})

//USER LOGOUT :
userAuthRouter.post('/logout', (req, res) => {
    try {
        if(req.cookies.sessionId) {
            res.clearCookie("sessionId", {
                httpOnly: true,
                secure: process.env.COOKIE_SECURITY === "true",
                sameSite: "lax",
            })  
        } else {
            return res.status(401).json({
                msgType: "Error",
                msg: "User already logged out.",
                error: "Unauthorized user."
            })
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "LogOut operation Successful.",
            response: "User Logged out."
        })
    } catch(err) {
        return res.status(500).json({
                msgType: "Error",
                msg: "An Unknown Error Occured",
                error: "Internal Server Error."
        })
    }
})

userAuthRouter.get("/create-admin", async (req, res) => {
    const {
        email,
        password,
        role
    } = req.body

    const adminUser = new admin({
        email: email,
        password: password,
        role: role,
    })

    await adminUser.save()

    res.send("Done.")
})


//TODO: FORGOT PASSWORD FUNCTIONALITY :
userAuthRouter.get('/forgot-password', async (req, res) => {
    try {
        const {
            email
        } = req.body

        if(!email) {
            return res.status(400).json({
                msgType: "Error",
                msg: "No Email provided.",
                error: "Email is required."
            })
        }

        
        
        
    } catch (err) {
        res.status(400).json({
            msgType: "Error",
            msg: "Try Again.",
            error: err.message
        })
    }
})


export default userAuthRouter