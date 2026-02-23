import { Router } from "express";
import bcrypt from "bcrypt";
import { admin, organizer, participant } from "../schema/userSchema/index.js";
import { generatePassword } from "../auth/auth.js";
import { sendMail } from '../services/mail.js'
import normalEvent from '../schema/eventSchema/normalEvent.js'
import merchandiseEvent from '../schema/eventSchema/merchandiseEventSchema.js'
import Registration from '../schema/registrationSchema/registrationSchema.js'
import PasswordReset from '../schema/passwordResetSchema/passwordResetSchema.js'

const adminRouter = Router()

adminRouter.post("/create-org", async (req, res) => {
    try {
        const userData = req.userData
        if (userData.role === 'Admin') {
            const {
                organizerName,
                description,
                category,
                contactEmail,
            } = req.body

            const isExist = await organizer.findOne({ organizerName })
            if (isExist) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: "User creation failed.",
                    error: "Organizer Already exist."
                })
            }

            const email = organizerName.split(' ').join('.').toLowerCase() + "@felicity.local"
            const password = generatePassword()

            const html = `
                    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

                        <!-- Header -->
                        <div style="background-color: #1f2937; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0;">Felicity Management System</h2>
                        </div>

                        <!-- Body -->
                        <div style="padding: 30px; color: #333;">
                        <p style="font-size: 16px;">Hello <strong>${organizerName} Team</strong>,</p>

                        <p style="font-size: 15px; line-height: 1.6;">
                            Your organizer account has been successfully created.
                        </p>

                        <!-- Credential Box -->
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="margin: 5px 0; "><strong>Login Email:</strong> ${email}</h3>
                            <h3 style="margin: 5px 0;"><strong>Temporary Password:</strong> ${password}</h3>
                        </div>

                        <p style="font-size: 14px; color: #b91c1c;">
                            Please log in and request to admin for changing password immediately for security purposes.
                        </p>
                        <!-- Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_BASE_URL}/login"
                            style="background-color: #2563eb; color: #ffffff; padding: 12px 24px;
                                    text-decoration: none; border-radius: 5px; font-size: 14px;">
                            Login to Dashboard
                            </a>
                        </div>

                        <p style="font-size: 14px;">Regards,<br/><strong>Felicity Tech Team</strong></p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
                        © ${new Date().getFullYear()} Felicity Management System
                        </div>

                    </div>
                    </div>
            `;


            const newOrganizer = await organizer({
                email,
                password,
                organizerName,
                description,
                category,
                contactEmail,
                role: 'Organizer'
            })

            try {
                const saved = await newOrganizer.save()
                sendMail(contactEmail, html, "Your Organizer Account for Felicity.")
                return res.status(201).json({
                    msgType: "Success",
                    msg: "User created succefully",
                    response: {
                        ...saved.toObject(),
                        generatedPassword: password,
                    },
                })
            } catch (err) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: "User creation failed",
                    error: err?.message ?? err
                })
            }

        } else {
            return res.status(403).json({
                msgType: "Error",
                msg: "Organizer creation failed.",
                error: "Permission denied."
            })
        }
    } catch (err) {
        return res.status(400).json({
            msgType: "Error",
            msg: "Organizer creation failed.",
            error: err.message,
        })
    }
})

adminRouter.post("/create-admin", async (req, res) => {
    try {
        const userData = req.userData
        if (userData.role === 'Admin') {
            const {
                email,
                password,
            } = req.body

            const newAdmin = await admin({
                email,
                password,
                role: 'Admin'
            })

            try {
                const saved = await newAdmin.save()
                return res.status(201).json({
                    msgType: "Success",
                    msg: "User created succefully",
                    response: saved,
                })
            } catch (err) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: "User creation failed",
                    error: err?.message ?? err
                })
            }

        } else {
            return res.status(403).json({
                msgType: "Error",
                msg: "Admin creation failed.",
                error: "Permission denied."
            })
        }
    } catch (err) {
        return res.status(400).json({
            msgType: "Error",
            msg: "Admin creation failed.",
            error: err.message,
        })
    }
})

// ─── ADMIN DASHBOARD STATS ─────────────────────────────────────────
adminRouter.get('/dashboard-stats', async (req, res) => {
    try {
        if (req.userData.role !== 'Admin') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const totalParticipants = await participant.countDocuments()
        const totalOrganizers = await organizer.countDocuments()

        // Active events (not ended yet)
        const now = new Date()
        const activeNormalEvents = await normalEvent.countDocuments({ isDraft: false, eventEndDate: { $gte: now } })
        const activeMerchEvents = await merchandiseEvent.countDocuments({ isDraft: false, eventEndDate: { $gte: now } })
        const totalActiveEvents = activeNormalEvents + activeMerchEvents

        // Total revenue from merchandise registrations
        const revenueResult = await Registration.aggregate([
            { $match: { eventType: 'Merchandise', paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ])
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0

        // Recent activity: last 5 organizers created
        const recentOrganizers = await organizer.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('organizerName category contactEmail createdAt')

        // Recent activity: last 5 events created
        const recentNormal = await normalEvent.find({ isDraft: false })
            .sort({ createdAt: -1 }).limit(5)
        const recentMerch = await merchandiseEvent.find({ isDraft: false })
            .sort({ createdAt: -1 }).limit(5)

        let recentEvents = [...recentNormal, ...recentMerch]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)

        // Enrich events with organizer name
        const enrichedEvents = []
        for (const event of recentEvents) {
            const org = await organizer.findById(event.organizerId)
            enrichedEvents.push({
                _id: event._id,
                eventName: event.eventName,
                eventType: event.eventType,
                organizerName: org?.organizerName || 'Unknown',
                eventStartDate: event.eventStartDate,
                createdAt: event.createdAt,
            })
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Dashboard stats retrieved.",
            stats: {
                totalParticipants,
                totalOrganizers,
                totalActiveEvents,
                totalRevenue,
            },
            recentOrganizers,
            recentEvents: enrichedEvents,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed to get dashboard stats.", error: err.message })
    }
})

// ─── LIST ALL ORGANIZERS (with credentials) ─────────────────────────
adminRouter.get('/organizers', async (req, res) => {
    try {
        if (req.userData.role !== 'Admin') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const { search } = req.query
        let filter = {}

        if (search && search.trim()) {
            const searchTerm = search.trim()
            filter = {
                $or: [
                    { organizerName: { $regex: searchTerm, $options: 'i' } },
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { contactEmail: { $regex: searchTerm, $options: 'i' } },
                    { category: { $regex: searchTerm, $options: 'i' } },
                ]
            }
        }

        const organizers = await organizer.find(filter)
            .sort({ createdAt: -1 })
            .select('organizerName email password contactEmail category description createdAt')

        return res.status(200).json({
            msgType: "Success",
            msg: "Organizers retrieved.",
            organizers,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed to get organizers.", error: err.message })
    }
})

// ─── DELETE ORGANIZER (cascading delete) ────────────────────────────
adminRouter.delete('/delete-organizer/:id', async (req, res) => {
    try {
        if (req.userData.role !== 'Admin') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const organizerId = req.params.id
        const org = await organizer.findById(organizerId)
        if (!org) {
            return res.status(404).json({ msgType: "Error", msg: "Organizer not found." })
        }

        // Find all events by this organizer
        const normalEvents = await normalEvent.find({ organizerId })
        const merchEvents = await merchandiseEvent.find({ organizerId })
        const allEventIds = [
            ...normalEvents.map(e => e._id),
            ...merchEvents.map(e => e._id),
        ]

        // Delete all registrations for these events
        await Registration.deleteMany({ eventId: { $in: allEventIds } })

        // Delete all events
        await normalEvent.deleteMany({ organizerId })
        await merchandiseEvent.deleteMany({ organizerId })

        // Delete any password reset requests
        await PasswordReset.deleteMany({ organizerId })

        // Delete the organizer
        await organizer.findByIdAndDelete(organizerId)

        return res.status(200).json({
            msgType: "Success",
            msg: `Organizer "${org.organizerName}" and all associated data deleted.`,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed to delete organizer.", error: err.message })
    }
})

// ─── GET PASSWORD RESET REQUESTS ────────────────────────────────────
adminRouter.get('/password-reset-requests', async (req, res) => {
    try {
        if (req.userData.role !== 'Admin') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const activeRequests = await PasswordReset.find({ status: 'pending' })
            .sort({ createdAt: -1 })

        const completedRequests = await PasswordReset.find({ status: { $in: ['completed', 'rejected'] } })
            .sort({ completedAt: -1 })

        return res.status(200).json({
            msgType: "Success",
            msg: "Password reset requests retrieved.",
            activeRequests,
            completedRequests,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed to get reset requests.", error: err.message })
    }
})

// ─── CHANGE ORGANIZER PASSWORD (Admin action) ───────────────────────
adminRouter.put('/change-organizer-password/:requestId', async (req, res) => {
    try {
        if (req.userData.role !== 'Admin') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const resetRequest = await PasswordReset.findById(req.params.requestId)
        if (!resetRequest || resetRequest.status !== 'pending') {
            return res.status(404).json({ msgType: "Error", msg: "Request not found or already processed." })
        }

        const { newPassword } = req.body
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ msgType: "Error", msg: "Password must be at least 8 characters." })
        }

        // Update the organizer's password
        const org = await organizer.findById(resetRequest.organizerId)
        if (!org) {
            return res.status(404).json({ msgType: "Error", msg: "Organizer not found." })
        }

        org.password = newPassword
        await org.save()

        // Update the reset request
        resetRequest.status = 'completed'
        resetRequest.completedAt = new Date()
        await resetRequest.save()

        // Clear any pending status on other requests from same organizer
        await PasswordReset.updateMany(
            { organizerId: resetRequest.organizerId, status: 'pending', _id: { $ne: resetRequest._id } },
            { status: 'completed', completedAt: new Date() }
        )

        // Send notification email to organizer
        try {
            const html = `
                <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <div style="background-color: #1f2937; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0;">Felicity - Password Changed</h2>
                    </div>
                    <div style="padding: 30px; color: #333;">
                        <p style="font-size: 16px;">Hello <strong>${org.organizerName} Team</strong>,</p>
                        <p>Your password has been changed by the Admin as per your request.</p>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p><strong>Login Email:</strong> ${org.email}</p>
                            <p><strong>New Password:</strong> ${newPassword}</p>
                        </div>
                        <p style="font-size: 14px; color: #b91c1c;">Please log in and remember your new credentials.</p>
                        <p style="font-size: 14px;">Regards,<br/><strong>Felicity Tech Team</strong></p>
                    </div>
                </div>
                </div>
            `
            sendMail(org.contactEmail, html, "Password Changed - Felicity Management System")
        } catch (mailErr) {
            console.error('Email notification failed:', mailErr)
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Password changed successfully.",
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed to change password.", error: err.message })
    }
})

// ─── REJECT PASSWORD RESET REQUEST ──────────────────────────────────
adminRouter.put('/reject-password-reset/:requestId', async (req, res) => {
    try {
        if (req.userData.role !== 'Admin') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const resetRequest = await PasswordReset.findById(req.params.requestId)
        if (!resetRequest || resetRequest.status !== 'pending') {
            return res.status(404).json({ msgType: "Error", msg: "Request not found or already processed." })
        }

        resetRequest.status = 'rejected'
        resetRequest.completedAt = new Date()
        await resetRequest.save()

        // Send rejection email
        const org = await organizer.findById(resetRequest.organizerId)
        if (org) {
            try {
                const html = `
                    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                        <div style="background-color: #1f2937; padding: 20px; text-align: center;">
                            <h2 style="color: #ffffff; margin: 0;">Felicity - Password Reset Rejected</h2>
                        </div>
                        <div style="padding: 30px; color: #333;">
                            <p style="font-size: 16px;">Hello <strong>${org.organizerName} Team</strong>,</p>
                            <p>Your password reset request has been <strong style="color: #b91c1c;">rejected</strong> by the Admin.</p>
                            <p>If you believe this was an error, please contact the Admin directly.</p>
                            <p style="font-size: 14px;">Regards,<br/><strong>Felicity Tech Team</strong></p>
                        </div>
                    </div>
                    </div>
                `
                sendMail(org.contactEmail, html, "Password Reset Request Rejected - Felicity")
            } catch (mailErr) {
                console.error('Email notification failed:', mailErr)
            }
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Password reset request rejected.",
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed to reject request.", error: err.message })
    }
})

export default adminRouter