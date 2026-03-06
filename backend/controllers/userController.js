import bcrypt from "bcrypt"
import { participant, organizer } from "../schema/userSchema/index.js"
import PasswordReset from "../schema/passwordResetSchema/passwordResetSchema.js"

// Returns the authenticated user's profile data
export const getUserInfo = (req, res) => {
    return res.status(200).json({
        msgType: "Success",
        msg: "User Data",
        response: req.userData
    })
}

// Updates profile fields for participant or organizer based on role
export const editProfile = async (req, res) => {
    try {
        const user = req.userData
        const { firstName, lastName, contactNumber, orgName, interests, followedOrganizers } = req.body

        if (user.role === "Participant") {
            const p = await participant.findById(user._id)
            if (!p) return res.status(404).json({ msgType: "Error", msg: "User not found." })

            if (firstName) p.firstName = firstName
            if (lastName) p.lastName = lastName
            if (contactNumber) p.contactNumber = contactNumber
            if (orgName) p.orgName = orgName
            if (interests) p.interests = interests
            if (followedOrganizers) p.followedOrganizers = followedOrganizers

            await p.save()
            return res.status(200).json({
                msgType: "Success",
                msg: "Profile updated.",
                response: p
            })
        }

        if (user.role === "Organizer") {
            const { organizerName, description, category, contactEmail, discordWebhook } = req.body
            const o = await organizer.findById(user._id)
            if (!o) return res.status(404).json({ msgType: "Error", msg: "User not found." })

            if (organizerName) o.organizerName = organizerName
            if (description) o.description = description
            if (category) o.category = category
            if (contactEmail) o.contactEmail = contactEmail
            if (discordWebhook !== undefined) o.discordWebhook = discordWebhook

            await o.save()
            return res.status(200).json({
                msgType: "Success",
                msg: "Profile updated.",
                response: o
            })
        }

        return res.status(400).json({
            msgType: "Error",
            msg: "Invalid role.",
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
}

// Validates current password and updates to new password (participants only)
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        const user = req.userData

        if (user.role !== "Participant") {
            return res.status(200).json({
                msgType: "Error",
                msg: "Error Changing Password.",
                error: "Only Participant can change password through this path, Organizers must need admin permission or Invalid role."
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
}

// Updates participant interest tags and followed organizer list
export const editPreference = async (req, res) => {
    try {
        if (req.userData.role !== "Participant") {
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
}

// Submits a password reset request for organizer accounts pending admin approval
export const requestPasswordReset = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({ msgType: "Error", msg: "Only organizers can request password resets." })
        }

        const { currentPassword } = req.body
        if (!currentPassword) {
            return res.status(400).json({ msgType: "Error", msg: "Current password is required." })
        }

        const match = await bcrypt.compare(currentPassword, req.userData.password)
        if (!match) {
            return res.status(400).json({ msgType: "Error", msg: "Current password is incorrect." })
        }

        const existing = await PasswordReset.findOne({
            organizerId: req.userData._id,
            status: "pending"
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
}

// Checks if the organizer has a pending password reset request
export const getPasswordResetStatus = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const pendingRequest = await PasswordReset.findOne({
            organizerId: req.userData._id,
            status: "pending"
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
}
