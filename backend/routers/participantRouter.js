import express from "express"
import QRCode from 'qrcode'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import normalEvent from '../schema/eventSchema/normalEvent.js'
import merchandiseEvent from '../schema/eventSchema/merchandiseEventSchema.js'
import Registration from '../schema/registrationSchema/registrationSchema.js'
import { TeamRegistration } from '../schema/registrationSchema/index.js'
import ChatMessage from '../schema/chatSchema/chatMessageSchema.js'
import { organizer, participant } from '../schema/userSchema/index.js'
import { sendMail } from '../services/mail.js'
import Fuse from 'fuse.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const participantRouter = express.Router()

// Chat file upload config (PDF only)
const chatUploadsDir = path.join(__dirname, '../uploads/chat')
if (!fs.existsSync(chatUploadsDir)) {
    fs.mkdirSync(chatUploadsDir, { recursive: true })
}

const chatFileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, chatUploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`
        cb(null, uniqueName)
    }
})

const chatFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext === '.pdf') {
        cb(null, true)
    } else {
        cb(new Error('Only PDF files are allowed.'), false)
    }
}

const uploadChatFile = multer({
    storage: chatFileStorage,
    fileFilter: chatFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

// POST-SIGNUP ONBOARDING - Update interests & follow organizers
participantRouter.post('/onboarding', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const { interests, followOrganizerIds } = req.body
        const userId = req.userData._id

        const user = await participant.findById(userId)
        if (!user) {
            return res.status(404).json({ msgType: "Error", msg: "User not found." })
        }

        // Update interests
        if (interests && Array.isArray(interests)) {
            user.interests = interests
        }

        // Follow selected organizers
        if (followOrganizerIds && Array.isArray(followOrganizerIds)) {
            const existing = new Set((user.followedOrganizers || []).map(id => id.toString()))
            for (const orgId of followOrganizerIds) {
                if (!existing.has(orgId)) {
                    user.followedOrganizers.push(orgId)
                }
            }
        }

        await user.save()

        return res.status(200).json({
            msgType: "Success",
            msg: "Onboarding completed.",
            response: user,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// GET TOP 3 ORGANIZERS (by total registrations)
participantRouter.get('/top-organizers', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const allOrganizers = await organizer.find({})
        const orgData = []

        for (const org of allOrganizers) {
            // Count total registrations across all events by this organizer
            const events = await normalEvent.find({ organizerId: org._id, isDraft: false })
            const merchEvents = await merchandiseEvent.find({ organizerId: org._id, isDraft: false })
            const allEvents = [...events, ...merchEvents]

            let totalRegs = 0
            for (const event of allEvents) {
                totalRegs += await Registration.countDocuments({ eventId: event._id })
            }

            orgData.push({
                _id: org._id,
                organizerName: org.organizerName || org.email,
                totalRegistrations: totalRegs,
            })
        }

        // Sort by total registrations desc, take top 3
        orgData.sort((a, b) => b.totalRegistrations - a.totalRegistrations)
        const top3 = orgData.slice(0, 3)

        return res.status(200).json({
            msgType: "Success",
            msg: "Top organizers.",
            organizers: top3,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// GET MY REGISTRATIONS (Dashboard)
participantRouter.get('/my-registrations', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const registrations = await Registration.find({ participantId: req.userData._id })
            .sort({ createdAt: -1 })

        // Enrich with event data
        const enriched = []
        for (const reg of registrations) {
            let event = await normalEvent.findById(reg.eventId) ||
                        await merchandiseEvent.findById(reg.eventId)

            if (!event) continue

            // Determine event status
            const now = new Date()
            const startDate = new Date(event.eventStartDate)
            const endDate = new Date(event.eventEndDate)
            let eventStatus = 'upcoming'
            if (now >= startDate && now <= endDate) eventStatus = 'ongoing'
            else if (now > endDate) eventStatus = 'completed'

            // Get organizer name
            const org = await organizer.findById(event.organizerId)

            // Check if this registration is part of a team event
            let isTeamEvent = false
            if (event.allowTeamRegistration) {
                const teamReg = await TeamRegistration.findOne({
                    eventId: reg.eventId,
                    'teamMembers.participantId': req.userData._id,
                })
                if (teamReg) isTeamEvent = true
            }

            enriched.push({
                _id: reg._id,
                ticketId: reg.ticketId,
                eventId: reg.eventId,
                eventName: event.eventName || 'Untitled Event',
                eventType: event.eventType,
                eventStatus,
                organizerName: org?.organizerName || 'Unknown',
                eventStartDate: event.eventStartDate,
                eventEndDate: event.eventEndDate,
                eventdescription: event.eventdescription || '',
                registrationDate: reg.createdAt,
                status: reg.status,
                totalAmount: reg.totalAmount,
                paymentStatus: reg.paymentStatus,
                attendance: reg.attendance,
                qrCode: reg.qrCode,
                merchandiseSelections: reg.merchandiseSelections || [],
                isTeamEvent,
            })
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Registrations retrieved.",
            registrations: enriched,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed to get registrations.", error: err.message })
    }
})

// BROWSE EVENTS (Public for Participants)
participantRouter.get('/browse-events', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const { search, eventType, eligibility, dateFrom, dateTo, followedOnly } = req.query
        const now = new Date()

        // Build filter - only published, non-draft events
        const filter = { isDraft: false }

        // Only show events that haven't ended
        filter.eventEndDate = { $gte: now }

        // Eligibility filter
        if (eligibility && eligibility !== 'All') {
            if (eligibility === 'IIITH') {
                filter.eligibility = { $in: ['IIITH', 'Both'] }
            } else if (eligibility === 'Non-IIITH') {
                filter.eligibility = { $in: ['Non-IIITH', 'Both'] }
            }
        }

        // Date range filter
        if (dateFrom) {
            filter.eventStartDate = { ...(filter.eventStartDate || {}), $gte: new Date(dateFrom) }
        }
        if (dateTo) {
            filter.eventEndDate = { ...(filter.eventEndDate || {}), $lte: new Date(dateTo) }
        }

        // Fetch events based on eventType filter
        // Note: Don't add eventType to filter object — discriminator models
        // automatically scope queries to their own type, so adding eventType
        // to the filter causes conflicts and breaks the filter.
        let allEvents = []
        if (eventType === 'Normal') {
            allEvents = await normalEvent.find(filter)
        } else if (eventType === 'Merchandise') {
            allEvents = await merchandiseEvent.find(filter)
        } else {
            const [normalEvents, merchEvents] = await Promise.all([
                normalEvent.find(filter),
                merchandiseEvent.find(filter)
            ])
            allEvents = [...normalEvents, ...merchEvents]
        }

        // Search filter using Fuse.js (fuzzy + weighted field scoring)
        // scoreMap: eventId -> relevance score (0–1, higher = better)
        const scoreMap = new Map()
        if (search && search.trim()) {
            const searchTerm = search.trim()

            // Pre-load organizer names for all events in one pass
            const orgNameMap = new Map()
            const uniqueOrgIds = [...new Set(allEvents.map(e => e.organizerId?.toString()).filter(Boolean))]
            const orgsForSearch = await organizer.find({ _id: { $in: uniqueOrgIds } }, { _id: 1, organizerName: 1 })
            orgsForSearch.forEach(o => orgNameMap.set(o._id.toString(), o.organizerName || ''))

            // Build flat docs for Fuse (tags joined into a single string)
            const fuseDocs = allEvents.map(event => ({
                _id: event._id.toString(),
                eventName: event.eventName || '',
                eventdescription: event.eventdescription || '',
                tags: (event.eventTags || []).join(' '),
                orgName: orgNameMap.get(event.organizerId?.toString()) || '',
            }))

            const fuse = new Fuse(fuseDocs, {
                includeScore: true,
                threshold: 0.45,       // 0 = exact only, 1 = match anything
                ignoreLocation: true,  // don't penalise matches at end of string
                minMatchCharLength: 2,
                keys: [
                    { name: 'eventName',        weight: 3 },
                    { name: 'orgName',           weight: 2 },
                    { name: 'tags',              weight: 2 },
                    { name: 'eventdescription',  weight: 1 },
                ],
            })

            const fuseResults = fuse.search(searchTerm)
            // Fuse score: 0 = perfect, 1 = worst → convert to relevance (1 = perfect)
            fuseResults.forEach(r => scoreMap.set(r.item._id, 1 - (r.score ?? 1)))

            const matchedIds = new Set(scoreMap.keys())
            allEvents = allEvents.filter(event => matchedIds.has(event._id.toString()))
        }

        // Followed clubs filter
        if (followedOnly === 'true') {
            const user = await participant.findById(req.userData._id)
            const followedIds = (user?.followedOrganizers || []).map(id => id.toString())
            if (followedIds.length > 0) {
                allEvents = allEvents.filter(e => followedIds.includes(e.organizerId?.toString()))
            } else {
                allEvents = []
            }
        }

        // Fetch participant's interests for preference scoring
        const currentUser = await participant.findById(req.userData._id)
        const userInterests = (currentUser?.interests || []).map(i => i.toLowerCase().trim())

        // Enrich events with organizer name, registration count, preference score and search score
        const enriched = []
        const isSearching = search && search.trim()
        for (const event of allEvents) {
            const org = await organizer.findById(event.organizerId)
            const regCount = await Registration.countDocuments({ eventId: event._id })

            // Compute preference_score: count of event tags matching participant interests
            let preferenceScore = 0
            if (userInterests.length > 0 && event.eventTags && event.eventTags.length > 0) {
                for (const tag of event.eventTags) {
                    if (userInterests.includes(tag.toLowerCase().trim())) {
                        preferenceScore++
                    }
                }
            }

            const searchScore = scoreMap.get(event._id.toString()) || 0

            enriched.push({
                _id: event._id,
                eventName: event.eventName,
                eventDescription: event.eventdescription,
                eventType: event.eventType,
                coverImage: event.coverImage,
                eligibility: event.eligibility,
                registrationDeadline: event.registrationDeadline,
                eventStartDate: event.eventStartDate,
                eventEndDate: event.eventEndDate,
                registrationLimit: event.registrationLimit,
                registrationFee: event.registrationFee,
                registrationCount: regCount,
                organizerName: org?.organizerName || 'Unknown',
                organizerId: event.organizerId,
                eventTags: event.eventTags || [],
                preferenceScore,
                searchScore,
            })
        }

        // When searching: sort by total score (searchScore + preferenceScore) descending.
        // When not searching: sort by preferenceScore desc, then nearest start date.
        if (isSearching) {
            enriched.sort((a, b) => {
                const totalA = a.searchScore + a.preferenceScore
                const totalB = b.searchScore + b.preferenceScore
                if (totalB !== totalA) return totalB - totalA
                return new Date(a.eventStartDate) - new Date(b.eventStartDate)
            })
        } else {
            enriched.sort((a, b) => {
                if (b.preferenceScore !== a.preferenceScore) {
                    return b.preferenceScore - a.preferenceScore
                }
                return new Date(a.eventStartDate) - new Date(b.eventStartDate)
            })
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Events retrieved.",
            events: enriched,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed to browse events.", error: err.message })
    }
})

// TRENDING EVENTS (Top 5 by registrations in 24h)
participantRouter.get('/trending-events', async (req, res) => {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const now = new Date()

        // Count recent registrations per event
        const trending = await Registration.aggregate([
            { $match: { createdAt: { $gte: last24h }, status: 'confirmed' } },
            { $group: { _id: '$eventId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ])

        const events = []
        for (const t of trending) {
            let event = await normalEvent.findById(t._id) ||
                        await merchandiseEvent.findById(t._id)
            if (!event || event.isDraft) continue

            // Only include events whose registration deadline has not passed
            if (event.registrationDeadline && new Date(event.registrationDeadline) < now) continue

            const org = await organizer.findById(event.organizerId)
            events.push({
                _id: event._id,
                eventName: event.eventName,
                eventDescription: event.eventdescription,
                eventType: event.eventType,
                coverImage: event.coverImage,
                organizerName: org?.organizerName || 'Unknown',
                registrationCount: t.count,
                eventStartDate: event.eventStartDate,
            })
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Trending events.",
            events,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// GET EVENT DETAILS (Participant View)
participantRouter.get('/event/:id', async (req, res) => {
    try {
        const eventId = req.params.id

        let event = await normalEvent.findById(eventId) ||
                    await merchandiseEvent.findById(eventId)

        if (!event || event.isDraft) {
            return res.status(404).json({ msgType: "Error", msg: "Event not found." })
        }

        const org = await organizer.findById(event.organizerId)
        const regCount = await Registration.countDocuments({ eventId: event._id, status: { $ne: 'cancelled' } })

        // Check if current user is already registered
        let isRegistered = false
        let existingReg = null
        let ticketInfo = null
        let teamInfo = null
        if (req.userData.role === 'Participant') {
            existingReg = await Registration.findOne({
                eventId: event._id,
                participantId: req.userData._id
            })
            isRegistered = !!existingReg
            
            // If registered, include ticket information
            if (existingReg) {
                ticketInfo = {
                    ticketId: existingReg.ticketId,
                    status: existingReg.status,
                    qrCode: existingReg.qrCode,
                    totalAmount: existingReg.totalAmount,
                    paymentStatus: existingReg.paymentStatus,
                    merchandiseSelections: existingReg.merchandiseSelections || []
                }
            }

            // Check if user is part of a team for this event
            const teamReg = await TeamRegistration.findOne({
                eventId: event._id,
                $or: [
                    { teamLeaderId: req.userData._id },
                    { 'teamMembers.participantId': req.userData._id }
                ]
            })
            if (teamReg) {
                const leader = await participant.findById(teamReg.teamLeaderId)
                teamInfo = {
                    teamRegId: teamReg._id,
                    teamName: teamReg.teamName,
                    teamStatus: teamReg.teamStatus,
                    status: teamReg.status,
                    isLeader: teamReg.teamLeaderId.toString() === req.userData._id.toString(),
                    leaderName: leader ? `${leader.firstName} ${leader.lastName}` : 'Unknown',
                    leaderEmail: leader?.email || '',
                    teamMembers: teamReg.teamMembers.map(m => ({
                        name: m.name,
                        email: m.email,
                        status: m.status,
                    })),
                }
            }
        }

        // Determine if registration is open
        const now = new Date()
        const deadlinePassed = new Date(event.registrationDeadline) < now
        const isFull = regCount >= event.registrationLimit

        // For merchandise, check stock
        let stockStatus = null
        if (event.eventType === 'Merchandise' && event.merchandiseItems) {
            stockStatus = event.merchandiseItems.map(item => ({
                itemId: item.itemId,
                name: item.name,
                basePrice: item.basePrice,
                perParticipantLimit: item.perParticipantLimit,
                variants: item.variants.map(v => ({
                    variantId: v.variantId,
                    size: v.size,
                    color: v.color,
                    stock: v.stock,
                    coverImage: v.coverImage,
                }))
            }))
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Event details retrieved.",
            response: {
                _id: event._id,
                eventName: event.eventName,
                eventDescription: event.eventdescription,
                eventType: event.eventType,
                coverImage: event.coverImage,
                eligibility: event.eligibility,
                registrationDeadline: event.registrationDeadline,
                eventStartDate: event.eventStartDate,
                eventEndDate: event.eventEndDate,
                registrationLimit: event.registrationLimit,
                registrationFee: event.registrationFee,
                registrationCount: regCount,
                organizerId: event.organizerId,
                organizerName: org?.organizerName || 'Unknown',
                organizerCategory: org?.category || '',
                eventTags: event.eventTags || [],
                formFields: event.formFields || [],
                isRegistered,
                existingTicketId: existingReg?.ticketId || null,
                ticketInfo: ticketInfo,
                deadlinePassed,
                isFull,
                merchandiseItems: stockStatus,
                allowTeamRegistration: event.allowTeamRegistration || false,
                minTeamSize: event.minTeamSize || 2,
                maxTeamSize: event.maxTeamSize || 4,
                teamInfo,
            }
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// REGISTER FOR NORMAL EVENT
participantRouter.post('/register/:eventId', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const eventId = req.params.eventId
        const event = await normalEvent.findById(eventId)

        if (!event || event.isDraft) {
            return res.status(404).json({ 
                msgType: "Error", 
                msg: "Event registration failed.",
                error: "Event not found."
            })
        }

        // Validation
        const now = new Date()
        if (new Date(event.registrationDeadline) < now) {
            return res.status(400).json({ msgType: "Error", msg: "Registration deadline has passed." })
        }

        const regCount = await Registration.countDocuments({ eventId })
        if (regCount >= event.registrationLimit) {
            return res.status(400).json({ msgType: "Error", msg: "Registration limit reached." })
        }

        // Eligibility check
        const user = await participant.findById(req.userData._id)
        if (event.eligibility !== 'Both') {
            if (event.eligibility === 'IIITH' && user.participantType !== 'IIITH') {
                return res.status(403).json({ msgType: "Error", msg: "This event is only for IIITH participants." })
            }
            if (event.eligibility === 'Non-IIITH' && user.participantType !== 'Non-IIITH') {
                return res.status(403).json({ msgType: "Error", msg: "This event is only for Non-IIITH participants." })
            }
        }

        // Check duplicate
        const existing = await Registration.findOne({ eventId, participantId: req.userData._id })
        if (existing) {
            return res.status(400).json({ msgType: "Error", msg: "Already registered for this event." })
        }

        // Create registration
        const registration = new Registration({
            eventId,
            participantId: req.userData._id,
            eventType: 'Normal',
            formResponses: req.body.formResponses || {},
            totalAmount: event.registrationFee || 0,
            paymentStatus: 'paid',
            qrCode: `QR-${Date.now()}-${req.userData._id}`,
        })

        await registration.save()

        // Generate QR Code image
        let qrCodeImage = ''
        try {
            qrCodeImage = await QRCode.toDataURL(registration.ticketId)
        } catch (qrErr) {
            console.error('QR Code generation failed:', qrErr)
        }

        // Update registration with QR code image
        registration.qrCode = qrCodeImage
        await registration.save()

        // Send confirmation email
        const org = await organizer.findById(event.organizerId)
        try {
            const html = `
                <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <div style="background-color: #1f2937; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0;">Felicity - Event Registration</h2>
                    </div>
                    <div style="padding: 30px; color: #333;">
                        <p style="font-size: 16px;">Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
                        <p>You have successfully registered for <strong>${event.eventName}</strong>!</p>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p><strong>Event:</strong> ${event.eventName}</p>
                            <p><strong>Organizer:</strong> ${org?.organizerName || 'N/A'}</p>
                            <p><strong>Ticket ID:</strong> ${registration.ticketId}</p>
                            <p><strong>Date:</strong> ${new Date(event.eventStartDate).toLocaleDateString()}</p>
                            <p><strong>Amount:</strong> ₹${registration.totalAmount}</p>
                        </div>
                        <div style="text-align: center; margin: 20px 0;">
                            <p style="margin-bottom: 10px;"><strong>Your Ticket QR Code:</strong></p>
                            <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px; border: 2px solid #ddd; border-radius: 8px;" />
                            <p style="margin-top: 10px; font-size: 12px; color: #666;">Show this QR code at the event</p>
                        </div>
                        <p style="font-size: 14px;">Regards,<br/><strong>Felicity Tech Team</strong></p>
                    </div>
                </div>
                </div>
            `
            
            // Attach QR code as inline image
            const attachments = [{
                filename: 'qrcode.png',
                content: qrCodeImage.split('base64,')[1],
                encoding: 'base64',
                cid: 'qrcode'
            }]
            
            sendMail(user.email, html, `Registration Confirmed - ${event.eventName}`, attachments)
        } catch (mailErr) {
            console.error('Email send failed:', mailErr)
        }

        return res.status(201).json({
            msgType: "Success",
            msg: "Registered successfully.",
            registration: {
                ticketId: registration.ticketId,
                eventName: event.eventName,
                status: registration.status,
                qrCode: registration.qrCode,
            }
        })
    } catch (err) {
        console.error(err)
        if (err.code === 11000) {
            return res.status(400).json({ msgType: "Error", msg: "Already registered for this event." })
        }
        return res.status(500).json({ msgType: "Error", msg: "Registration failed.", error: err.message })
    }
})

// PURCHASE MERCHANDISE
participantRouter.post('/purchase/:eventId', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const eventId = req.params.eventId
        const event = await merchandiseEvent.findById(eventId)

        if (!event || event.isDraft) {
            return res.status(404).json({ msgType: "Error", msg: "Event not found." })
        }

        const now = new Date()
        if (new Date(event.registrationDeadline) < now) {
            return res.status(400).json({ msgType: "Error", msg: "Purchase deadline has passed." })
        }

        // Check duplicate
        const existing = await Registration.findOne({ eventId, participantId: req.userData._id })
        if (existing) {
            return res.status(400).json({ msgType: "Error", msg: "Already purchased from this event." })
        }

        const { selections } = req.body // Array of { itemId, variantId, quantity }
        if (!selections || !Array.isArray(selections) || selections.length === 0) {
            return res.status(400).json({ msgType: "Error", msg: "No items selected." })
        }

        let totalAmount = 0
        const merchandiseSelections = []

        for (const sel of selections) {
            const item = event.merchandiseItems.find(i => i.itemId === sel.itemId)
            if (!item) {
                return res.status(400).json({ msgType: "Error", msg: `Item ${sel.itemId} not found.` })
            }

            const variant = item.variants.find(v => v.variantId === sel.variantId)
            if (!variant) {
                return res.status(400).json({ msgType: "Error", msg: `Variant ${sel.variantId} not found.` })
            }

            const qty = sel.quantity || 1
            if (qty > item.perParticipantLimit) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: `Quantity exceeds per-participant limit for ${item.name}.`
                })
            }

            if (variant.stock < qty) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: `Insufficient stock for ${item.name} (${variant.size}/${variant.color}).`
                })
            }

            // Decrement stock
            variant.stock -= qty
            totalAmount += item.basePrice * qty

            merchandiseSelections.push({
                itemId: item.itemId,
                itemName: item.name,
                variantId: variant.variantId,
                size: variant.size,
                color: variant.color,
                quantity: qty,
                price: item.basePrice * qty,
            })
        }

        // Save updated stock
        await event.save()

        // Create registration
        const registration = new Registration({
            eventId,
            participantId: req.userData._id,
            eventType: 'Merchandise',
            merchandiseSelections,
            totalAmount,
            paymentStatus: 'paid',
            qrCode: `QR-${Date.now()}-${req.userData._id}`,
        })

        await registration.save()

        // Generate QR Code image
        let qrCodeImage = ''
        try {
            qrCodeImage = await QRCode.toDataURL(registration.ticketId)
        } catch (qrErr) {
            console.error('QR Code generation failed:', qrErr)
        }

        // Update registration with QR code image
        registration.qrCode = qrCodeImage
        await registration.save()

        // Send email
        const user = await participant.findById(req.userData._id)
        const org = await organizer.findById(event.organizerId)
        try {
            const itemsHtml = merchandiseSelections.map(s =>
                `<tr><td style="padding:8px;border:1px solid #ddd;">${s.itemName}</td>
                 <td style="padding:8px;border:1px solid #ddd;">${s.size} / ${s.color}</td>
                 <td style="padding:8px;border:1px solid #ddd;">${s.quantity}</td>
                 <td style="padding:8px;border:1px solid #ddd;">₹${s.price}</td></tr>`
            ).join('')

            const html = `
                <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #1f2937; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff;">Felicity - Purchase Confirmation</h2>
                    </div>
                    <div style="padding: 30px; color: #333;">
                        <p>Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
                        <p>Your merchandise purchase from <strong>${event.eventName}</strong> is confirmed!</p>
                        <p><strong>Ticket ID:</strong> ${registration.ticketId}</p>
                        <table style="width:100%;border-collapse:collapse;margin:15px 0;">
                            <tr style="background:#f3f4f6;">
                                <th style="padding:8px;border:1px solid #ddd;">Item</th>
                                <th style="padding:8px;border:1px solid #ddd;">Variant</th>
                                <th style="padding:8px;border:1px solid #ddd;">Qty</th>
                                <th style="padding:8px;border:1px solid #ddd;">Price</th>
                            </tr>
                            ${itemsHtml}
                        </table>
                        <p><strong>Total: ₹${totalAmount}</strong></p>
                        <div style="text-align: center; margin: 20px 0;">
                            <p style="margin-bottom: 10px;"><strong>Your Ticket QR Code:</strong></p>
                            <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px; border: 2px solid #ddd; border-radius: 8px;" />
                            <p style="margin-top: 10px; font-size: 12px; color: #666;">Show this QR code at the event</p>
                        </div>
                        <p style="font-size:14px;">Regards,<br/><strong>Felicity Tech Team</strong></p>
                    </div>
                </div>
                </div>
            `
            
            // Attach QR code as inline image
            const attachments = [{
                filename: 'qrcode.png',
                content: qrCodeImage.split('base64,')[1],
                encoding: 'base64',
                cid: 'qrcode'
            }]
            
            sendMail(user.email, html, `Purchase Confirmed - ${event.eventName}`, attachments)
        } catch (mailErr) {
            console.error('Email failed:', mailErr)
        }

        return res.status(201).json({
            msgType: "Success",
            msg: "Purchase successful.",
            registration: {
                ticketId: registration.ticketId,
                merchandiseSelections,
                totalAmount,
                qrCode: registration.qrCode,
            }
        })
    } catch (err) {
        console.error(err)
        if (err.code === 11000) {
            return res.status(400).json({ msgType: "Error", msg: "Already purchased from this event." })
        }
        return res.status(500).json({ msgType: "Error", msg: "Purchase failed.", error: err.message })
    }
})

// GET TICKET DETAILS
participantRouter.get('/ticket/:ticketId', async (req, res) => {
    try {
        const reg = await Registration.findOne({
            ticketId: req.params.ticketId,
            participantId: req.userData._id
        })
        if (!reg) {
            return res.status(404).json({ msgType: "Error", msg: "Ticket not found." })
        }

        let event = await normalEvent.findById(reg.eventId) ||
                    await merchandiseEvent.findById(reg.eventId)
        const org = event ? await organizer.findById(event.organizerId) : null

        return res.status(200).json({
            msgType: "Success",
            msg: "Ticket details.",
            ticket: {
                ticketId: reg.ticketId,
                eventName: event?.eventName || 'Unknown',
                eventType: reg.eventType,
                organizerName: org?.organizerName || 'Unknown',
                participantName: `${req.userData.firstName} ${req.userData.lastName}`,
                participantEmail: req.userData.email,
                status: reg.status,
                totalAmount: reg.totalAmount,
                paymentStatus: reg.paymentStatus,
                qrCode: reg.qrCode,
                merchandiseSelections: reg.merchandiseSelections,
                eventStartDate: event?.eventStartDate,
                eventEndDate: event?.eventEndDate,
                registrationDate: reg.createdAt,
            }
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// CANCEL REGISTRATION (unified for individual and team)
participantRouter.put('/cancel-registration/:id', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        // Determine whether this is an individual or team registration
        const teamReg = await TeamRegistration.findById(req.params.id)
        const reg = teamReg ? null : await Registration.findById(req.params.id)

        if (!reg && !teamReg) {
            return res.status(404).json({ msgType: "Error", msg: "Registration not found." })
        }

        // --- Common validation ---
        const eventId = reg ? reg.eventId : teamReg.eventId
        const currentStatus = reg ? reg.status : teamReg.status

        if (currentStatus === 'cancelled') {
            return res.status(400).json({ msgType: "Error", msg: "Registration is already cancelled." })
        }

        const event = await normalEvent.findById(eventId) || await merchandiseEvent.findById(eventId)
        if (event) {
            const now = new Date()
            if (now >= new Date(event.eventStartDate) && now <= new Date(event.eventEndDate)) {
                return res.status(400).json({ msgType: "Error", msg: "Cannot cancel registration after the event has started." })
            } else if (now >= new Date(event.eventEndDate)) {
                return res.status(400).json({ msgType: "Error", msg: "Cannot cancel registration as event has ended." })
            }
        }

        // --- Individual registration cancellation ---
        if (reg && !teamReg) {
            if (reg.participantId.toString() !== req.userData._id.toString()) {
                return res.status(403).json({ msgType: "Error", msg: "You can only cancel your own registration." })
            }

            // Block individual cancellation for team event registrations
            if (event && event.allowTeamRegistration) {
                const linkedTeamReg = await TeamRegistration.findOne({
                    eventId: reg.eventId,
                    'teamMembers.participantId': req.userData._id,
                })
                if (linkedTeamReg) {
                    return res.status(400).json({
                        msgType: "Error",
                        msg: "This registration is part of a team. Only the team leader can cancel through the team management section.",
                    })
                }
            }

            // Cancel registration — invalidate QR code and ticket
            reg.status = 'cancelled'
            reg.qrCode = null
            reg.paymentStatus = 'refunded'
            await reg.save()

            // If merchandise, restore stock
            if (reg.eventType === 'Merchandise' && reg.merchandiseSelections?.length > 0) {
                const merchEvent = await merchandiseEvent.findById(reg.eventId)
                if (merchEvent) {
                    for (const sel of reg.merchandiseSelections) {
                        const item = merchEvent.merchandiseItems.find(i => i.itemId === sel.itemId)
                        if (item) {
                            const variant = item.variants.find(v => v.variantId === sel.variantId)
                            if (variant) {
                                variant.stock += sel.quantity
                            }
                        }
                    }
                    await merchEvent.save()
                }
            }

            return res.status(200).json({
                msgType: "Success",
                msg: "Registration cancelled successfully. Ticket and QR code are now invalid.",
            })

        // --- Team registration cancellation ---
        } else {
            if (teamReg.teamLeaderId.toString() !== req.userData._id.toString()) {
                return res.status(403).json({ msgType: "Error", msg: "Only the team leader can cancel the team registration." })
            }

            // Cancel the team registration — invalidate QR code and refund
            teamReg.status = 'cancelled'
            teamReg.teamStatus = 'incomplete'
            teamReg.qrCode = null
            teamReg.paymentStatus = 'refunded'
            await teamReg.save()

            // Cancel all individual member registrations for this event
            const memberIds = [
                teamReg.teamLeaderId,
                ...teamReg.teamMembers.map(m => m.participantId),
            ]

            await Registration.updateMany(
                {
                    eventId: teamReg.eventId,
                    participantId: { $in: memberIds },
                    _id: { $ne: teamReg._id },
                    status: { $ne: 'cancelled' },
                },
                {
                    $set: {
                        status: 'cancelled',
                        qrCode: null,
                        paymentStatus: 'refunded',
                    },
                }
            )

            // Notify members via email
            const leader = await participant.findById(teamReg.teamLeaderId)
            for (const member of teamReg.teamMembers) {
                try {
                    const html = `
                        <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                            <div style="background-color: #dc2626; padding: 20px; text-align: center;">
                                <h2 style="color: #ffffff;">Felicity - Team Registration Cancelled</h2>
                            </div>
                            <div style="padding: 30px; color: #333;">
                                <p>Hello,</p>
                                <p>The team <strong>"${teamReg.teamName}"</strong> registration for <strong>${event?.eventName || 'the event'}</strong> has been cancelled by team leader <strong>${leader ? `${leader.firstName} ${leader.lastName}` : 'Unknown'}</strong>.</p>
                                <p>Your ticket and QR code for this event are now invalid.</p>
                                <p style="font-size: 14px;">Regards,<br/><strong>Felicity Tech Team</strong></p>
                            </div>
                        </div>
                        </div>
                    `
                    sendMail(member.email, html, `Team Registration Cancelled - ${event?.eventName || 'Event'}`)
                } catch (mailErr) {
                    console.error('Cancellation email failed:', mailErr)
                }
            }

            return res.status(200).json({
                msgType: "Success",
                msg: "Team registration cancelled. All member tickets and QR codes are now invalid.",
            })
        }
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Cancellation failed.", error: err.message })
    }
})

// GET ALL ORGANIZERS (Clubs/Organizers Listing)
participantRouter.get('/organizers', async (req, res) => {
    try {
        const { search } = req.query

        const allOrganizers = await organizer.find({}, {
            organizerName: 1,
            category: 1,
            description: 1,
            contactEmail: 1,
            _id: 1,
        })

        // Check which ones the user follows
        let followedIds = []
        if (req.userData.role === 'Participant') {
            const user = await participant.findById(req.userData._id)
            followedIds = (user?.followedOrganizers || []).map(id => id.toString())
        }

        let result = allOrganizers.map(org => ({
            _id: org._id,
            organizerName: org.organizerName || '',
            category: org.category || '',
            description: org.description || '',
            contactEmail: org.contactEmail,
            isFollowed: followedIds.includes(org._id.toString()),
            searchScore: 0,
        }))

        // Apply Fuse.js fuzzy search if a term is provided
        if (search && search.trim()) {
            const fuse = new Fuse(result, {
                includeScore: true,
                threshold: 0.45,
                ignoreLocation: true,
                minMatchCharLength: 2,
                keys: [
                    { name: 'organizerName', weight: 3 },
                    { name: 'category',      weight: 2 },
                    { name: 'description',   weight: 1 },
                ],
            })

            const fuseResults = fuse.search(search.trim())
            result = fuseResults.map(r => ({
                ...r.item,
                searchScore: 1 - (r.score ?? 1),
            }))
            // Already sorted by Fuse relevance; re-sort descending to be explicit
            result.sort((a, b) => b.searchScore - a.searchScore)
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Organizers retrieved.",
            organizers: result,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// FOLLOW/UNFOLLOW ORGANIZER
participantRouter.post('/toggle-follow/:organizerId', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const orgId = req.params.organizerId
        const user = await participant.findById(req.userData._id)

        if (!user.followedOrganizers) {
            user.followedOrganizers = []
        }

        const idx = user.followedOrganizers.findIndex(id => id.toString() === orgId)
        if (idx === -1) {
            user.followedOrganizers.push(orgId)
        } else {
            user.followedOrganizers.splice(idx, 1)
        }

        await user.save()

        return res.status(200).json({
            msgType: "Success",
            msg: idx === -1 ? "Followed organizer." : "Unfollowed organizer.",
            isFollowed: idx === -1,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// GET ORGANIZER DETAIL (Participant View)
participantRouter.get('/organizer/:id', async (req, res) => {
    try {
        const org = await organizer.findById(req.params.id, {
            organizerName: 1,
            category: 1,
            description: 1,
            contactEmail: 1,
        })

        if (!org) {
            return res.status(404).json({ msgType: "Error", msg: "Organizer not found." })
        }

        const now = new Date()

        // Get events by this organizer (non-draft only)
        const normalEvents = await normalEvent.find({ organizerId: org._id, isDraft: false })
        const merchEvents = await merchandiseEvent.find({ organizerId: org._id, isDraft: false })
        const allEvents = [...normalEvents, ...merchEvents]

        const upcoming = []
        const past = []

        for (const event of allEvents) {
            const regCount = await Registration.countDocuments({ eventId: event._id })
            const eventData = {
                _id: event._id,
                eventName: event.eventName,
                eventType: event.eventType,
                coverImage: event.coverImage,
                eventStartDate: event.eventStartDate,
                eventEndDate: event.eventEndDate,
                registrationCount: regCount,
            }

            if (new Date(event.eventEndDate) >= now) {
                upcoming.push(eventData)
            } else {
                past.push(eventData)
            }
        }

        // Check follow status
        let isFollowed = false
        if (req.userData.role === 'Participant') {
            const user = await participant.findById(req.userData._id)
            isFollowed = (user?.followedOrganizers || []).some(id => id.toString() === org._id.toString())
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Organizer details.",
            organizer: {
                _id: org._id,
                organizerName: org.organizerName,
                category: org.category,
                description: org.description,
                contactEmail: org.contactEmail,
                isFollowed,
            },
            upcomingEvents: upcoming,
            pastEvents: past,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// ─── TEAM REGISTRATION ROUTES ──────────────────────────────────────

// CREATE TEAM (Team Leader registers)
participantRouter.post('/team/create/:eventId', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const eventId = req.params.eventId
        const { teamName, memberEmails } = req.body

        const event = await normalEvent.findById(eventId)
        if (!event || event.isDraft) {
            return res.status(404).json({ msgType: "Error", msg: "Event not found." })
        }

        if (!event.allowTeamRegistration) {
            return res.status(400).json({ msgType: "Error", msg: "This event does not allow team registration." })
        }

        // Validation
        const now = new Date()
        if (new Date(event.registrationDeadline) < now) {
            return res.status(400).json({ msgType: "Error", msg: "Registration deadline has passed." })
        }

        if (!teamName || teamName.trim().length < 2 || teamName.trim().length > 30) {
            return res.status(400).json({ msgType: "Error", msg: "Team name must be 2-30 characters." })
        }

        if (!memberEmails || !Array.isArray(memberEmails)) {
            return res.status(400).json({ msgType: "Error", msg: "Member emails are required." })
        }

        // Total team size = leader + members
        const totalSize = memberEmails.length + 1
        if (totalSize < event.minTeamSize || totalSize > event.maxTeamSize) {
            return res.status(400).json({
                msgType: "Error",
                msg: `Team size must be between ${event.minTeamSize} and ${event.maxTeamSize}. You have ${totalSize} members (including you).`
            })
        }

        // Check leader is not already registered
        const existingReg = await Registration.findOne({ eventId, participantId: req.userData._id })
        if (existingReg) {
            return res.status(400).json({ msgType: "Error", msg: "You are already registered for this event." })
        }

        // Check leader email is not in member list
        const leaderEmail = req.userData.email.toLowerCase()
        if (memberEmails.map(e => e.toLowerCase()).includes(leaderEmail)) {
            return res.status(400).json({ msgType: "Error", msg: "You cannot invite yourself." })
        }

        // Resolve all member emails to participant IDs
        const teamMembers = []
        for (const email of memberEmails) {
            const member = await participant.findOne({ email: email.toLowerCase() })
            if (!member) {
                return res.status(400).json({ msgType: "Error", msg: `No participant found with email: ${email}` })
            }

            // Check if member is already registered for this event
            const memberReg = await Registration.findOne({ eventId, participantId: member._id })
            if (memberReg) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: `${email} is already registered for this event.`
                })
            }

            // Eligibility check for member
            if (event.eligibility !== 'Both') {
                if (event.eligibility === 'IIITH' && member.participantType !== 'IIITH') {
                    return res.status(400).json({ msgType: "Error", msg: `${email} is not eligible (IIITH only).` })
                }
                if (event.eligibility === 'Non-IIITH' && member.participantType !== 'Non-IIITH') {
                    return res.status(400).json({ msgType: "Error", msg: `${email} is not eligible (Non-IIITH only).` })
                }
            }

            teamMembers.push({
                participantId: member._id,
                email: member.email,
                name: `${member.firstName} ${member.lastName}`,
                status: 'pending',
            })
        }

        // Create team registration
        const teamReg = new TeamRegistration({
            eventId,
            participantId: req.userData._id,
            eventType: 'Normal',
            status: 'pending',
            formResponses: req.body.formResponses || {},
            totalAmount: event.registrationFee || 0,
            paymentStatus: 'paid',
            teamName: teamName.trim(),
            teamLeaderId: req.userData._id,
            teamSize: totalSize,
            teamMembers,
            teamStatus: 'forming',
        })

        await teamReg.save()

        // Send invitation emails to all members
        const org = await organizer.findById(event.organizerId)
        for (const member of teamMembers) {
            try {
                const html = `
                    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #1f2937; padding: 20px; text-align: center;">
                            <h2 style="color: #ffffff;">Felicity - Team Invitation</h2>
                        </div>
                        <div style="padding: 30px; color: #333;">
                            <p>Hello,</p>
                            <p><strong>${req.userData.firstName} ${req.userData.lastName}</strong> has invited you to join team <strong>"${teamName}"</strong> for the event <strong>${event.eventName}</strong>.</p>
                            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                <p><strong>Event:</strong> ${event.eventName}</p>
                                <p><strong>Organizer:</strong> ${org?.organizerName || 'N/A'}</p>
                                <p><strong>Team:</strong> ${teamName}</p>
                                <p><strong>Team Leader:</strong> ${req.userData.firstName} ${req.userData.lastName}</p>
                            </div>
                            <p>Please log in to your dashboard to accept or decline this invitation.</p>
                            <p style="font-size: 14px;">Regards,<br/><strong>Felicity Tech Team</strong></p>
                        </div>
                    </div>
                    </div>
                `
                sendMail(member.email, html, `Team Invitation - ${event.eventName}`)
            } catch (mailErr) {
                console.error('Invitation email failed:', mailErr)
            }
        }

        return res.status(201).json({
            msgType: "Success",
            msg: "Team created. Invitations sent to all members.",
            teamRegistration: {
                _id: teamReg._id,
                teamName: teamReg.teamName,
                teamStatus: teamReg.teamStatus,
                teamMembers: teamReg.teamMembers,
            }
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Team creation failed.", error: err.message })
    }
})

// GET MY TEAM INVITES
participantRouter.get('/team/invites', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        // Find team registrations where user is an invited member
        const teamRegs = await TeamRegistration.find({
            'teamMembers.participantId': req.userData._id,
            'teamMembers.status': 'pending',
            teamStatus: 'forming',
        })

        const invites = []
        for (const reg of teamRegs) {
            const event = await normalEvent.findById(reg.eventId)
            if (!event) continue

            const leader = await participant.findById(reg.teamLeaderId)
            const org = await organizer.findById(event.organizerId)
            const myMembership = reg.teamMembers.find(m => m.participantId.toString() === req.userData._id.toString())

            if (myMembership && myMembership.status === 'pending') {
                invites.push({
                    teamRegId: reg._id,
                    teamName: reg.teamName,
                    eventId: event._id,
                    eventName: event.eventName,
                    eventStartDate: event.eventStartDate,
                    organizerName: org?.organizerName || 'Unknown',
                    leaderName: leader ? `${leader.firstName} ${leader.lastName}` : 'Unknown',
                    leaderEmail: leader?.email || '',
                    teamSize: reg.teamSize,
                    teamMembers: reg.teamMembers.map(m => ({
                        name: m.name,
                        email: m.email,
                        status: m.status,
                    })),
                })
            }
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Invites retrieved.",
            invites,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// ACCEPT/DECLINE TEAM INVITE
participantRouter.post('/team/respond/:teamRegId', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const { action } = req.body // 'accept' or 'decline'
        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({ msgType: "Error", msg: "Invalid action." })
        }

        const teamReg = await TeamRegistration.findById(req.params.teamRegId)
        if (!teamReg) {
            return res.status(404).json({ msgType: "Error", msg: "Team registration not found." })
        }

        const member = teamReg.teamMembers.find(m => m.participantId.toString() === req.userData._id.toString())
        if (!member) {
            return res.status(403).json({ msgType: "Error", msg: "You are not a member of this team." })
        }

        if (member.status !== 'pending') {
            return res.status(400).json({ msgType: "Error", msg: "You have already responded to this invite." })
        }

        member.status = action === 'accept' ? 'accepted' : 'declined'
        if (action === 'accept') {
            member.joinedAt = new Date()
        }

        // Check if team is now complete (all accepted)
        const allAccepted = teamReg.teamMembers.every(m => m.status === 'accepted')
        const anyDeclined = teamReg.teamMembers.some(m => m.status === 'declined')

        if (anyDeclined) {
            teamReg.teamStatus = 'incomplete'
            teamReg.status = 'cancelled'
        } else if (allAccepted) {
            teamReg.teamStatus = 'complete'
            teamReg.status = 'confirmed'

            // Generate QR code for team registration
            let qrCodeImage = ''
            try {
                qrCodeImage = await QRCode.toDataURL(teamReg.ticketId)
            } catch (qrErr) {
                console.error('QR Code generation failed:', qrErr)
            }
            teamReg.qrCode = qrCodeImage

            // Create individual registrations for each member (including leader)
            const event = await normalEvent.findById(teamReg.eventId)
            const org = event ? await organizer.findById(event.organizerId) : null

            // Create registrations for all accepted members
            for (const m of teamReg.teamMembers) {
                try {
                    const memberUser = await participant.findById(m.participantId)
                    const memberReg = new Registration({
                        eventId: teamReg.eventId,
                        participantId: m.participantId,
                        eventType: 'Normal',
                        status: 'confirmed',
                        totalAmount: event?.registrationFee || 0,
                        paymentStatus: 'paid',
                    })
                    await memberReg.save()

                    let memberQR = ''
                    try {
                        memberQR = await QRCode.toDataURL(memberReg.ticketId)
                    } catch (e) {}
                    memberReg.qrCode = memberQR
                    await memberReg.save()

                    // Send confirmation email
                    if (memberUser && event) {
                        const html = `
                            <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                                <div style="background-color: #1f2937; padding: 20px; text-align: center;">
                                    <h2 style="color: #ffffff;">Felicity - Team Registration Complete</h2>
                                </div>
                                <div style="padding: 30px; color: #333;">
                                    <p>Hello <strong>${memberUser.firstName} ${memberUser.lastName}</strong>,</p>
                                    <p>Your team <strong>"${teamReg.teamName}"</strong> has been fully formed for <strong>${event.eventName}</strong>!</p>
                                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                        <p><strong>Event:</strong> ${event.eventName}</p>
                                        <p><strong>Team:</strong> ${teamReg.teamName}</p>
                                        <p><strong>Your Ticket ID:</strong> ${memberReg.ticketId}</p>
                                    </div>
                                    <div style="text-align: center; margin: 20px 0;">
                                        <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
                                    </div>
                                    <p style="font-size: 14px;">Regards,<br/><strong>Felicity Tech Team</strong></p>
                                </div>
                            </div>
                            </div>
                        `
                        const attachments = memberQR ? [{
                            filename: 'qrcode.png',
                            content: memberQR.split('base64,')[1],
                            encoding: 'base64',
                            cid: 'qrcode'
                        }] : []
                        sendMail(memberUser.email, html, `Team Complete - ${event.eventName}`, attachments)
                    }
                } catch (e) {
                    console.error('Member registration failed:', e)
                }
            }
        }

        await teamReg.save()

        return res.status(200).json({
            msgType: "Success",
            msg: action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.',
            teamStatus: teamReg.teamStatus,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// GET MY TEAMS (for team management)
participantRouter.get('/team/my-teams', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const userId = req.userData._id.toString()

        // Teams where user is leader
        const leaderTeams = await TeamRegistration.find({ teamLeaderId: req.userData._id })

        // Teams where user is accepted member
        const memberTeams = await TeamRegistration.find({
            'teamMembers.participantId': req.userData._id,
            'teamMembers.status': 'accepted',
        })

        // Merge and deduplicate
        const allTeamIds = new Set()
        const allTeams = []

        for (const reg of [...leaderTeams, ...memberTeams]) {
            if (allTeamIds.has(reg._id.toString())) continue
            allTeamIds.add(reg._id.toString())

            const event = await normalEvent.findById(reg.eventId)
            if (!event) continue
            const org = await organizer.findById(event.organizerId)
            const leader = await participant.findById(reg.teamLeaderId)

            allTeams.push({
                _id: reg._id,
                teamName: reg.teamName,
                teamStatus: reg.teamStatus,
                status: reg.status,
                ticketId: reg.ticketId,
                eventId: event._id,
                eventName: event.eventName,
                eventStartDate: event.eventStartDate,
                organizerName: org?.organizerName || 'Unknown',
                isLeader: reg.teamLeaderId.toString() === userId,
                leaderName: leader ? `${leader.firstName} ${leader.lastName}` : 'Unknown',
                leaderEmail: leader?.email || '',
                teamMembers: await Promise.all(reg.teamMembers.map(async (m) => {
                    const memberUser = await participant.findById(m.participantId)
                    return {
                        participantId: m.participantId,
                        name: m.name,
                        email: m.email,
                        status: m.status,
                        joinedAt: m.joinedAt,
                        firstName: memberUser?.firstName || '',
                        lastName: memberUser?.lastName || '',
                        participantType: memberUser?.participantType || '',
                        organizationName: memberUser?.orgName || '',
                    }
                })),
            })
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Teams retrieved.",
            teams: allTeams,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// UPLOAD CHAT FILE (PDF)
participantRouter.post('/team/chat/upload/:teamRegId', uploadChatFile.single('file'), async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const teamReg = await TeamRegistration.findById(req.params.teamRegId)
        if (!teamReg) {
            return res.status(404).json({ msgType: "Error", msg: "Team not found." })
        }

        const userId = req.userData._id.toString()
        const isMember = teamReg.teamLeaderId.toString() === userId ||
            teamReg.teamMembers.some(m => m.participantId.toString() === userId && m.status === 'accepted')

        if (!isMember) {
            return res.status(403).json({ msgType: "Error", msg: "You are not a member of this team." })
        }

        // Check all members accepted
        const allAccepted = teamReg.teamMembers.every(m => m.status === 'accepted')
        if (!allAccepted) {
            return res.status(403).json({ msgType: "Error", msg: "Chat is not available until all members accept." })
        }

        // Check event not ended
        const event = await normalEvent.findById(teamReg.eventId) || await merchandiseEvent.findById(teamReg.eventId)
        if (event && new Date() > new Date(event.eventEndDate)) {
            return res.status(403).json({ msgType: "Error", msg: "Event has ended. Chat is read-only." })
        }

        if (!req.file) {
            return res.status(400).json({ msgType: "Error", msg: "No file uploaded." })
        }

        const fileUrl = `/uploads/chat/${req.file.filename}`
        const fileName = req.file.originalname

        return res.status(200).json({
            msgType: "Success",
            msg: "File uploaded.",
            fileUrl,
            fileName,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Upload failed.", error: err.message })
    }
})

// GET CHAT HISTORY

// GET UNREAD MESSAGE COUNTS PER TEAM
participantRouter.get('/team/unread-counts', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const userId = req.userData._id.toString()

        // Find all teams user belongs to
        const leaderTeams = await TeamRegistration.find({ teamLeaderId: req.userData._id })
        const memberTeams = await TeamRegistration.find({
            'teamMembers.participantId': req.userData._id,
            'teamMembers.status': 'accepted',
        })

        const allTeamIds = new Set()
        const teams = []

        for (const reg of [...leaderTeams, ...memberTeams]) {
            if (allTeamIds.has(reg._id.toString())) continue
            allTeamIds.add(reg._id.toString())
            teams.push(reg)
        }

        // Get last read timestamps from query or use a default (beginning of time)
        const lastReadTimestamps = JSON.parse(req.query.lastRead || '{}')

        const unreadCounts = {}
        for (const team of teams) {
            const lastRead = lastReadTimestamps[team._id.toString()]
                ? new Date(lastReadTimestamps[team._id.toString()])
                : new Date(0)

            const count = await ChatMessage.countDocuments({
                teamRegistrationId: team._id,
                createdAt: { $gt: lastRead },
                senderId: { $ne: req.userData._id },
            })

            if (count > 0) {
                unreadCounts[team._id.toString()] = count
            }
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Unread counts.",
            unreadCounts,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})
participantRouter.get('/team/chat/:teamRegId', async (req, res) => {
    try {
        if (req.userData.role !== 'Participant') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const teamReg = await TeamRegistration.findById(req.params.teamRegId)
        if (!teamReg) {
            return res.status(404).json({ msgType: "Error", msg: "Team not found." })
        }

        // Verify user is a member
        const userId = req.userData._id.toString()
        const isMember = teamReg.teamLeaderId.toString() === userId ||
            teamReg.teamMembers.some(m => m.participantId.toString() === userId && m.status === 'accepted')

        if (!isMember) {
            return res.status(403).json({ msgType: "Error", msg: "You are not a member of this team." })
        }

        const messages = await ChatMessage.find({ teamRegistrationId: req.params.teamRegId })
            .sort({ createdAt: 1 })
            .limit(500)

        // Check if team registration is cancelled
        const teamCancelled = teamReg.status === 'cancelled'

        // Check if all team members have accepted
        const allAccepted = teamReg.teamMembers.every(m => m.status === 'accepted')

        // Check if the event is still active (not closed/ended)
        const event = await normalEvent.findById(teamReg.eventId) || await merchandiseEvent.findById(teamReg.eventId)
        const now = new Date()
        const eventEnded = event ? now > new Date(event.eventEndDate) : false

        // Chat is enabled only if not cancelled AND all members accepted AND event hasn't ended
        const chatEnabled = !teamCancelled && allAccepted && !eventEnded

        // Enrich team members with extra details
        const enrichedMembers = await Promise.all(teamReg.teamMembers.map(async (m) => {
            const memberUser = await participant.findById(m.participantId)
            return {
                participantId: m.participantId,
                name: m.name,
                email: m.email,
                status: m.status,
                joinedAt: m.joinedAt,
                firstName: memberUser?.firstName || '',
                lastName: memberUser?.lastName || '',
                participantType: memberUser?.participantType || '',
                organizationName: memberUser?.orgName || '',
            }
        }))

        const leader = await participant.findById(teamReg.teamLeaderId)

        return res.status(200).json({
            msgType: "Success",
            msg: "Chat history.",
            messages,
            teamName: teamReg.teamName,
            teamMembers: enrichedMembers,
            leaderName: leader ? `${leader.firstName} ${leader.lastName}` : 'Unknown',
            leaderEmail: leader?.email || '',
            leaderId: teamReg.teamLeaderId,
            chatEnabled,
            chatDisabledReason: teamCancelled
                ? 'This team registration has been cancelled. Chat is disabled.'
                : !allAccepted
                    ? 'Chat is available only after all team members have accepted the invitation.'
                    : eventEnded
                        ? 'This event has ended. Chat is now read-only.'
                        : null,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// CALENDAR EXPORT - Generate .ics file
participantRouter.get('/calendar/export/:eventId', async (req, res) => {
    try {
        const eventId = req.params.eventId
        let event = await normalEvent.findById(eventId) || await merchandiseEvent.findById(eventId)

        if (!event) {
            return res.status(404).json({ msgType: "Error", msg: "Event not found." })
        }

        const org = await organizer.findById(event.organizerId)
        const start = new Date(event.eventStartDate)
        const end = new Date(event.eventEndDate)

        const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Felicity//Event//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            `DTSTART:${formatDate(start)}`,
            `DTEND:${formatDate(end)}`,
            `SUMMARY:${event.eventName}`,
            `DESCRIPTION:${(event.eventdescription || '').replace(/\n/g, '\\n')}`,
            `ORGANIZER;CN=${org?.organizerName || 'Felicity'}:mailto:${org?.contactEmail || 'felicity@iiit.ac.in'}`,
            `UID:${eventId}@felicity`,
            'BEGIN:VALARM',
            'TRIGGER:-PT30M',
            'ACTION:DISPLAY',
            `DESCRIPTION:Reminder: ${event.eventName} starts in 30 minutes`,
            'END:VALARM',
            'BEGIN:VALARM',
            'TRIGGER:-P1D',
            'ACTION:DISPLAY',
            `DESCRIPTION:Reminder: ${event.eventName} is tomorrow`,
            'END:VALARM',
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\r\n')

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${event.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`)
        return res.send(icsContent)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// CALENDAR BATCH EXPORT - Multiple events
participantRouter.post('/calendar/export-batch', async (req, res) => {
    try {
        const { eventIds } = req.body
        if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
            return res.status(400).json({ msgType: "Error", msg: "No events specified." })
        }

        const formatDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

        let vevents = ''
        for (const eventId of eventIds) {
            let event = await normalEvent.findById(eventId) || await merchandiseEvent.findById(eventId)
            if (!event) continue

            const org = await organizer.findById(event.organizerId)

            vevents += [
                'BEGIN:VEVENT',
                `DTSTART:${formatDate(event.eventStartDate)}`,
                `DTEND:${formatDate(event.eventEndDate)}`,
                `SUMMARY:${event.eventName}`,
                `DESCRIPTION:${(event.eventdescription || '').replace(/\n/g, '\\n')}`,
                `ORGANIZER;CN=${org?.organizerName || 'Felicity'}:mailto:${org?.contactEmail || 'felicity@iiit.ac.in'}`,
                `UID:${eventId}@felicity`,
                'BEGIN:VALARM',
                'TRIGGER:-PT30M',
                'ACTION:DISPLAY',
                `DESCRIPTION:Reminder: ${event.eventName} starts in 30 minutes`,
                'END:VALARM',
                'END:VEVENT',
            ].join('\r\n') + '\r\n'
        }

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Felicity//Event//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            vevents.trim(),
            'END:VCALENDAR',
        ].join('\r\n')

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="felicity_events.ics"')
        return res.send(icsContent)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

export default participantRouter
