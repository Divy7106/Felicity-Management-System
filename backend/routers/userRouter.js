import express from "express";
import bcrypt from "bcrypt";
import { participant, organizer } from "../schema/userSchema/index.js";
import PasswordReset from '../schema/passwordResetSchema/passwordResetSchema.js'

const userRouter = express.Router()

userRouter.get('/get-info', (req, res) => {
    return res.status(200).json({
        msgType: "Success",
        msg: "User Data",
        response: req.userData
    })
})

// EDIT USER PROFILE
userRouter.put('/edit-profile', async (req, res) => {
    try {
        const user = req.userData
        const { firstName, lastName, contactNumber, orgName, interests, followedOrganizers } = req.body

        if (user.role === 'Participant') {
            const p = await participant.findById(user._id)
            if (!p) return res.status(404).json({ msgType: "Error", msg: "User not found." })

            if (firstName) p.firstName = firstName
            if (lastName) p.lastName = lastName
            if (contactNumber) p.contactNumber = contactNumber
            if (orgName) p.orgName = orgName
            if (interests) p.interests = interests
            if (followedOrganizers) p.followedOrganizers = followedOrganizers
            console.log(interests)
            await p.save()
            return res.status(200).json({ 
                msgType: "Success", 
                msg: "Profile updated.", 
                response: p 
            })
        }

        if (user.role === 'Organizer') {
            const { organizerName, description, category, contactEmail, discordWebhook } = req.body
            const o = await organizer.findById(user._id)
            if (!o) return res.status(404).json({ msgType: "Error", msg: "User not found." })

            if (organizerName) o.organizerName = organizerName
            if (description) o.description = description
            if (category) o.category = category
            if (contactEmail) o.contactEmail = contactEmail
            if (discordWebhook !== undefined) o.discordWebhook = discordWebhook

            await o.save()
            await o.save()
            return res.status(200).json({ 
                msgType: "Success", 
                msg: "Profile updated.", 
                response: o
            })
        }

        return res.status(400).json({ 
            msgType: "Error", 
            msg: "Invalid role." ,
            error: "Given Role is note supported."
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ 
            msgType: "Error", 
            msg: "Profile update failed.", 
            error: err.message 
        })
    }
})

// CHANGE PASSWORD
userRouter.put('/change-password', async (req, res) => {
    try {
        
        const { currentPassword, newPassword } = req.body
        const user = req.userData

        if(user.role !== 'Participant') {
            return res.status(200).json({ 
                msgType: "Error", 
                msg: "Error Changing Password.", 
                error: 'Only Participant can change password through this path, Organizers must need admin permission or Invalid role.'
            })
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                msgType: "Error", 
                msg: "Password changing failed.",
                error: "Both current and new password required." 
            })
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ 
                msgType: "Error",
                msg: "Password changing failed.",
                error: "New password must be at least 8 characters."
            })
        }

        const match = await bcrypt.compare(currentPassword, user.password)
        if (!match) {
            return res.status(400).json({ 
                msgType: "Error", 
                msg: "Password changing failed.",
                error: "Current password is incorrect.",
            })
        }

        user.password = newPassword
        await user.save()

        return res.status(200).json({ 
            msgType: "Success", 
            msg: "Password changed successfully.",
            response: undefined,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ 
            msgType: "Error", 
            msg: "Password change failed.", 
            error: err.message 
        })
    }
})

// ─── EDIT PREFERENCES (Participant) ───────────────────────────────
userRouter.post('/edit-preference', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ 
                msgType: "Error", 
                msg: "Preference editing failed.",
                error: "Only participants can set preferences.",
            })
        }

        const { interests, followedOrganizers } = req.body
        const p = await participant.findById(req.userData._id)

        if (interests) p.interests = interests
        if (followedOrganizers) p.followedOrganizers = followedOrganizers

        await p.save()
        return res.status(200).json({ 
            msgType: "Success", 
            msg: "Preferences updated.", 
            response: p 
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ 
            msgType: "Error", 
            msg: "Failed.", 
            error: err.message
        })
    }
})

// ─── REQUEST PASSWORD RESET (Organizer) ─────────────────────────────
userRouter.post('/request-password-reset', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({ msgType: "Error", msg: "Only organizers can request password resets." })
        }

        const { currentPassword } = req.body
        if (!currentPassword) {
            return res.status(400).json({ msgType: "Error", msg: "Current password is required." })
        }

        // Validate current password
        const match = await bcrypt.compare(currentPassword, req.userData.password)
        if (!match) {
            return res.status(400).json({ msgType: "Error", msg: "Current password is incorrect." })
        }

        // Check if there's already a pending request
        const existing = await PasswordReset.findOne({
            organizerId: req.userData._id,
            status: 'pending'
        })
        if (existing) {
            return res.status(400).json({ msgType: "Error", msg: "You already have a pending password reset request." })
        }

        const org = await organizer.findById(req.userData._id)

        const resetRequest = new PasswordReset({
            organizerId: req.userData._id,
            organizerName: org.organizerName,
            organizerEmail: org.email,
            contactEmail: org.contactEmail,
        })

        await resetRequest.save()

        return res.status(201).json({
            msgType: "Success",
            msg: "Password reset request submitted. Please wait for Admin approval.",
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed to submit request.", error: err.message })
    }
})

// ─── GET MY PASSWORD RESET STATUS (Organizer) ──────────────────────
userRouter.get('/password-reset-status', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const pendingRequest = await PasswordReset.findOne({
            organizerId: req.userData._id,
            status: 'pending'
        })

        return res.status(200).json({
            msgType: "Success",
            msg: "Status retrieved.",
            hasPendingRequest: !!pendingRequest,
            request: pendingRequest || null,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

export default userRouter