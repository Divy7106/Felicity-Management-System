import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import normalEvent from '../schema/eventSchema/normalEvent.js'
import merchandiseEvent from '../schema/eventSchema/merchandiseEventSchema.js'
import Registration from '../schema/registrationSchema/registrationSchema.js'
import { TeamRegistration } from '../schema/registrationSchema/index.js'
import { participant, organizer } from '../schema/userSchema/index.js'
import AttendanceLog from '../schema/registrationSchema/attendanceLogSchema.js'

// ─── DISCORD WEBHOOK HELPER ────────────────────────────────────────
async function sendDiscordWebhook(webhookUrl, event, organizerName) {
    if (!webhookUrl) return
    try {
        const embed = {
            title: `🎉 New Event: ${event.eventName}`,
            description: event.eventdescription || 'No description.',
            color: event.eventType === 'Merchandise' ? 0x9B59B6 : 0x3498DB,
            fields: [
                { name: 'Type', value: event.eventType, inline: true },
                { name: 'Eligibility', value: event.eligibility || 'All', inline: true },
                { name: 'Fee', value: event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free', inline: true },
                { name: 'Registration Deadline', value: new Date(event.registrationDeadline).toLocaleString(), inline: false },
                { name: 'Event Dates', value: `${new Date(event.eventStartDate).toLocaleDateString()} – ${new Date(event.eventEndDate).toLocaleDateString()}`, inline: false },
            ],
            footer: { text: `Organized by ${organizerName}` },
            timestamp: new Date().toISOString(),
        }
        if (event.eventTags?.length > 0) {
            embed.fields.push({ name: 'Tags', value: event.eventTags.join(', '), inline: false })
        }
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] }),
        })
    } catch (err) {
        console.error('Discord webhook failed:', err.message)
    }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const organizerRouter = Router()

// Create unified upload directory
const imagesDir = path.join(__dirname, '../uploads/event')

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true })
}

// File filter middleware to check file extensions
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.png', '.jpeg', '.jpg']
    const ext = path.extname(file.originalname).toLowerCase()

    if (allowedExtensions.includes(ext)) {
        cb(null, true)
    } else {
        cb(new Error(`Invalid file type. Only PNG, JPEG, and JPG files are allowed. Received: ${ext}`), false)
    }
}

// Unified multer storage configuration
const eventStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagesDir)
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`
        cb(null, uniqueName)
    }
})

// Multer upload configuration
const uploadEvent = multer({
    storage: eventStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

// Unified create event route
organizerRouter.post('/create-event', uploadEvent.any(), async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only organizers can create events."
            })
        }
        const body = JSON.parse(req.body.eventData || '{}')
        const eventType = body.eventType || "Normal"
        console.log(eventType, body.eventType)

        if (body.isDraft === true || body.isDraft === 'true') {
            return res.status(403).json({
                msgType: "Error",
                msg: "Use /create-event-draft to save drafts",
                error: "Invalid path to save draft."
            })
        }

        var draft = null;
        if (body.wasDraft === true || body.wasDraft === 'true') {
            draft = await normalEvent.findById(body.id) || await merchandiseEvent.findById(body.id)
            if (draft) {
                delete body.id
            }
        }


        // Add organizerId from authenticated user
        body.organizerId = req.userData._id

        // Process cover image
        const coverImageFile = req.files.find(f => f.fieldname === 'coverImage')
        if (coverImageFile) {
            body.coverImage = `/uploads/event/${coverImageFile.filename}`
            if (draft && draft.coverImage) {
                const filePath = path.join(__dirname, `..${draft.coverImage}`)
                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => console.log(err))
                }
            }
        } else if (body.coverImage && draft) {
            const filePath = path.join(__dirname, `..${body.coverImage}`)
            if (fs.existsSync(filePath)) {
                console.log('File exists:', filePath)
            } else {
                return res.status(400).json({
                    msgType: "Error",
                    msg: "Cover image file does not exist.",
                    error: `File not found: ${body.coverImage}`
                })
            }
        } else {
            return res.status(400).json({
                msgType: "Error",
                msg: "Cover image is required.",
                error: "coverImage field is missing."
            })
        }

        // Process merchandise items and variants if present
        if (body.merchandiseItems && Array.isArray(body.merchandiseItems)) {
            for (let i = 0; i < body.merchandiseItems.length; i++) {
                const item = body.merchandiseItems[i]

                if (item.variants && Array.isArray(item.variants)) {
                    for (let j = 0; j < item.variants.length; j++) {
                        const variantImageFile = req.files.find(f =>
                            f.fieldname === `merchandiseItems[${i}][variants][${j}][coverImage]`
                        )
                        if (variantImageFile) {
                            body.merchandiseItems[i].variants[j].coverImage = `/uploads/event/${variantImageFile.filename}`
                        } else if (body.merchandiseItems[i]?.variants[j]?.coverImage) {
                            const filePath = path.join(__dirname, `..${body.merchandiseItems[i].variants[j].coverImage}`)
                            if (fs.existsSync(filePath)) {
                                console.log('File exists:', filePath)
                            } else {
                                return res.status(400).json({
                                    msgType: "Error",
                                    msg: "Cover image file does not exist.",
                                    error: `File not found: ${body.merchandiseItems[i].variants[j].coverImage}`
                                })
                            }
                        } else if (eventType === 'Merchandise') {
                            return res.status(400).json({
                                msgType: "Error",
                                msg: `Cover image is required for item ${i + 1}, variant ${j + 1}.`,
                                error: `Missing variant image for ${item.name}`
                            })
                        }
                    }
                }
            }
        }

        // Check for duplicate event name
        if (body.eventName) {
            const existingEvent = await normalEvent.findOne({
                eventName: body.eventName,
                organizerId: body.organizerId
            }) || await merchandiseEvent.findOne({
                eventName: body.eventName,
                organizerId: body.organizerId
            })

            if (existingEvent && !(existingEvent.isDraft)) {
                const now = new Date()
                const eventEndDate = new Date(existingEvent.eventEndDate)
                if (now <= eventEndDate) {
                    return res.status(400).json({
                        msgType: "Error",
                        msg: "Event with the same name already exists.",
                        error: "An active event with this name already exists for your organization."
                    })
                }
            }
        }

        if (eventType === 'Normal') {
            // Create and save the normal event
            const newEvent = new normalEvent(body)
            await newEvent.save()

            if (draft) {
                await normalEvent.findByIdAndDelete(draft._id)
                    || await merchandiseEvent.findByIdAndDelete(draft._id)
            }

            // Send Discord webhook notification
            const org = await organizer.findById(req.userData._id)
            if (org?.discordWebhook) {
                sendDiscordWebhook(org.discordWebhook, newEvent, org.organizerName)
            }

            return res.status(201).json({
                msgType: "Success",
                msg: "Normal event created successfully.",
                response: newEvent
            })

        } else if (eventType === 'Merchandise') {

            // Create and save the merchandise event
            const newEvent = new merchandiseEvent(body)
            await newEvent.save()

            if (draft) {
                await normalEvent.findByIdAndDelete(draft._id)
                    || await merchandiseEvent.findByIdAndDelete(draft._id)
            }

            // Send Discord webhook notification
            const org = await organizer.findById(req.userData._id)
            if (org?.discordWebhook) {
                sendDiscordWebhook(org.discordWebhook, newEvent, org.organizerName)
            }

            return res.status(201).json({
                msgType: "Success",
                msg: "Merchandise event created successfully.",
                response: newEvent
            })

        } else {
            return res.status(400).json({
                msgType: "Error",
                msg: "Invalid event type.",
                error: "eventType must be either 'Normal' or 'Merchandise'."
            })
        }

    } catch (error) {
        console.log(error)
        // Clean up uploaded files on error
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Error deleting file:', err)
                })
            })
        }

        return res.status(500).json({
            msgType: "Error",
            msg: "Failed to create event.",
            error: error.message
        })
    }
})

organizerRouter.post('/create-event-draft', uploadEvent.any(), async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only organizers can create events."
            })
        }
        const body = JSON.parse(req.body.eventData || '{}')
        const eventType = body.eventType ? "Normal" : ""
        delete body.eventType
        var prev_draft = null

        if (body.isDraft === false || body.isDraft === 'false') {
            return res.status(403).json({
                msgType: "Error",
                msg: "Use /create-event to save events",
                error: "Invalid path to save events."
            })
        }

        body.isDraft = true

        if (body.wasDraft === true || body.wasDraft === 'true') {
            prev_draft = await normalEvent.findById(body.id)
                || await merchandiseEvent.findById(body.id)
        }

        // Add organizerId from authenticated user
        body.organizerId = req.userData._id

        // Process cover image
        const coverImageFile = req.files.find(f => f.fieldname === 'coverImage')
        if (coverImageFile) {
            body.coverImage = `/uploads/event/${coverImageFile.filename}`
            if (prev_draft && prev_draft.coverImage) {
                const filePath = path.join(__dirname, `..${prev_draft.coverImage}`)
                if (fs.existsSync(filePath)) {
                    fs.unlink(filePath, (err) => console.log(err))
                }
            }
        } else if (body.coverImage && prev_draft) {
            const filePath = path.join(__dirname, `..${body.coverImage}`)
            if (fs.existsSync(filePath)) {
                console.log('File exists:', filePath)
            } else {
                return res.status(400).json({
                    msgType: "Error",
                    msg: "Cover image file does not exist.",
                    error: `File not found: ${body.coverImage}`
                })
            }
        }

        // Process merchandise items and variants if present
        if (body.merchandiseItems && Array.isArray(body.merchandiseItems)) {
            for (let i = 0; i < body.merchandiseItems.length; i++) {
                const item = body.merchandiseItems[i]

                if (item.variants && Array.isArray(item.variants)) {
                    for (let j = 0; j < item.variants.length; j++) {
                        const variantImageFile = req.files.find(f =>
                            f.fieldname === `merchandiseItems[${i}][variants][${j}][coverImage]`
                        )
                        if (variantImageFile) {
                            body.merchandiseItems[i].variants[j].coverImage = `/uploads/event/${variantImageFile.filename}`
                        } else if (body.merchandiseItems[i]?.variants[j]?.coverImage) {
                            const filePath = path.join(__dirname, `..${body.merchandiseItems[i].variants[j].coverImage}`)
                            if (fs.existsSync(filePath)) {
                                console.log('File exists:', filePath)
                            } else {
                                return res.status(400).json({
                                    msgType: "Error",
                                    msg: "Cover image file does not exist.",
                                    error: `File not found: ${body.merchandiseItems[i].variants[j].coverImage}`
                                })
                            }
                        }
                    }
                }
            }
        }

        if (prev_draft) {
            Object.assign(prev_draft, body)
            await prev_draft.save()
            return res.status(201).json({
                msgType: "Success",
                msg: "Draft created succefully.",
                response: prev_draft
            })
        }

        if (eventType === 'Normal') {
            // Create and save the normal event
            const newEvent = new normalEvent(body)
            await newEvent.save()

            return res.status(201).json({
                msgType: "Success",
                msg: "Normal event created successfully.",
                reponse: newEvent
            })

        } else if (eventType === 'Merchandise') {

            // Create and save the merchandise event
            const newEvent = new merchandiseEvent(body)
            await newEvent.save()

            return res.status(201).json({
                msgType: "Success",
                msg: "Merchandise event created successfully.",
                response: newEvent
            })

        } else {
            return res.status(400).json({
                msgType: "Error",
                msg: "Invalid event type.",
                error: "eventType must be either 'Normal' or 'Merchandise'."
            })
        }

    } catch (error) {
        console.log(error)
        // Clean up uploaded files on error
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                fs.unlink(file.path, (err) => {
                    if (err) console.error('Error deleting file:', err)
                })
            })
        }

        return res.status(500).json({
            msgType: "Error",
            msg: "Failed to create event.",
            error: error.message
        })
    }
})

organizerRouter.get('/get-org-min-events', async (req, res) => {
    try {
        // Check if user is an Organizer
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only organizers can access their events."
            })
        }

        // Get organizer ID from authenticated user
        const organizerId = req.userData._id

        // Fetch all events for this organizer from Normal and Merchandise collections
        const normalEvents = await normalEvent.find({ organizerId })
        const merchEvents = await merchandiseEvent.find({ organizerId })

        // Combine all arrays
        const allEvents = [...normalEvents, ...merchEvents]

        // Transform events to minimal data structure
        const currentDate = new Date()
        const minimalEvents = allEvents.map(event => {
            // Determine status based on dates and isDraft flag
            let status = ''
            let isDraftFlag = event.isDraft || false

            // Check if this is a draft
            if (isDraftFlag) {
                status = 'draft'
            } else {
                const startDate = new Date(event.eventStartDate)
                const endDate = new Date(event.eventEndDate)

                if (currentDate < startDate) {
                    status = 'published'
                } else if (currentDate >= startDate && currentDate <= endDate) {
                    status = 'onGoing'
                } else {
                    status = 'closed'
                }
            }

            // Truncate event description to 50 characters
            let description = event.eventdescription || ''
            if (description.length > 40) {
                description = description.substring(0, 40) + '...'
            }

            return {
                _id: event._id,
                eventName: event.eventName || 'Untitled Draft',
                eventDescription: description,
                eventType: event.eventType,
                coverImage: event.coverImage,
                status: status,
                isDraft: isDraftFlag
            }
        })

        return res.status(200).json({
            msgType: "Success",
            msg: "Events retrieved successfully.",
            events: minimalEvents
        })

    } catch (err) {
        console.error(err)
        return res.status(500).json({
            msgType: "Error",
            msg: "Failed to retrieve events.",
            error: err.message
        })
    }
})

// Get full event details by ID
organizerRouter.get('/get-org-max-event/:id', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only organizers can access event details."
            })
        }

        const eventId = req.params.id
        const organizerId = req.userData._id

        // Try to find in normal and merchandise collections
        let event = await normalEvent.findById(eventId) ||
            await merchandiseEvent.findById(eventId)

        if (!event) {
            return res.status(404).json({
                msgType: "Error",
                msg: "Event not found.",
                error: "No event found with the provided ID."
            })
        }

        // Verify the event belongs to this organizer
        if (event.organizerId.toString() !== organizerId.toString()) {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "You do not have access to this event."
            })
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Event retrieved successfully.",
            response: event
        })

    } catch (err) {
        console.error(err)
        return res.status(500).json({
            msgType: "Error",
            msg: "Failed to retrieve event.",
            error: err.message
        })
    }
})

// Edit event form (for published events)
organizerRouter.put('/edit-event-form/:id', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only organizers can edit events."
            })
        }

        const eventId = req.params.id
        const organizerId = req.userData._id
        const { eventDescription, registrationDeadline, registrationLimit, closeRegistration } = req.body

        // Try to find in both collections
        let event = await normalEvent.findById(eventId) || await merchandiseEvent.findById(eventId)

        if (!event) {
            return res.status(404).json({
                msgType: "Error",
                msg: "Event not found.",
                error: "No event found with the provided ID."
            })
        }

        // Verify the event belongs to this organizer
        if (event.organizerId.toString() !== organizerId.toString()) {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "You do not have access to this event."
            })
        }

        // Check if form is locked
        if (event.formLocked) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Cannot edit event.",
                error: "The event form is locked and cannot be edited."
            })
        }

        // Check if registration deadline has passed (unless we're closing registration)
        const now = new Date()
        if (!closeRegistration && new Date(event.registrationDeadline) < now) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Cannot edit event.",
                error: "The registration deadline has passed."
            })
        }

        // Update allowed fields
        if (eventDescription) event.eventdescription = eventDescription
        if (registrationLimit && registrationLimit > event.registrationLimit) {
            event.registrationLimit = registrationLimit
        }
        if (registrationDeadline && new Date(registrationDeadline) > new Date(event.registrationDeadline)) {
            event.registrationDeadline = registrationDeadline
        }
        if (closeRegistration === true) {
            event.registrationDeadline = now
        }

        // assigning isEdit to true to bypass pre validation check.
        event.isEdit = true

        await event.save()

        return res.status(200).json({
            msgType: "Success",
            msg: "Event updated successfully.",
            response: event
        })

    } catch (err) {
        console.error(err)
        return res.status(500).json({
            msgType: "Error",
            msg: "Failed to update event.",
            error: err.message
        })
    }
})

// ─── EVENT ANALYTICS (Organizer Dashboard) ────────────────────────
organizerRouter.get('/event-analytics', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const organizerId = req.userData._id
        const normalEvents = await normalEvent.find({ organizerId, isDraft: false })
        const merchEvents = await merchandiseEvent.find({ organizerId, isDraft: false })
        const allEvents = [...normalEvents, ...merchEvents]

        let totalRegistrations = 0
        let totalRevenue = 0
        let totalAttendance = 0
        let completedEvents = 0

        for (const event of allEvents) {
            const regs = await Registration.find({ eventId: event._id })
            const activeRegs = regs.filter(r => r.status !== 'cancelled')
            totalRegistrations += activeRegs.length
            totalRevenue += activeRegs.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
            totalAttendance += activeRegs.filter(r => r.attendance).length

            const now = new Date()
            if (new Date(event.eventEndDate) < now) completedEvents++
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Analytics retrieved.",
            analytics: {
                totalEvents: allEvents.length,
                completedEvents,
                totalRegistrations,
                totalRevenue,
                totalAttendance,
            }
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// ─── EVENT DETAIL WITH PARTICIPANTS (Organizer View) ──────────────
organizerRouter.get('/event-participants/:id', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only Organizers can access this api."
            })
        }
        const eventId = req.params.id
        const organizerId = req.userData._id

        let event = await normalEvent.findById(eventId) ||
            await merchandiseEvent.findById(eventId)

        if (!event) {
            return res.status(404).json({
                msgType: "Error",
                msg: "Event not found.",
                error: "Requested Event do not exist."
            })
        }

        if (event.organizerId.toString() !== organizerId.toString()) {
            return res.status(403).json({
                msgType: "Error",
                msg: "Access denied.",
                error: "This Event cannot be accessed."
            })
        }

        const registrations = await Registration.find({ eventId })
        // Enrich with participant data
        const participants = []
        for (const reg of registrations) {
            const p = await participant.findById(reg.participantId)
            participants.push({
                _id: reg._id,
                ticketId: reg.ticketId,
                participantName: p ? `${p.firstName} ${p.lastName}` : 'Unknown',
                participantEmail: p?.email || 'Unknown',
                registrationDate: reg.createdAt,
                paymentStatus: reg.paymentStatus,
                totalAmount: reg.totalAmount,
                attendance: reg.attendance,
                status: reg.status,
                merchandiseSelections: reg.merchandiseSelections || [],
            })
        }

        // Compute event analytics (exclude cancelled)
        const activeRegistrations = registrations.filter(r => r.status !== 'cancelled')
        const totalRegs = activeRegistrations.length
        const totalRevenue = activeRegistrations.reduce((s, r) => s + (r.totalAmount || 0), 0)
        const totalAttendance = activeRegistrations.filter(r => r.attendance).length

        // Determine status
        const now = new Date()
        let status = 'draft'
        if (!event.isDraft) {
            const start = new Date(event.eventStartDate)
            const end = new Date(event.eventEndDate)
            if (now < start) status = 'published'
            else if (now >= start && now <= end) status = 'onGoing'
            else status = 'closed'
        }


        // Fetch team registrations for this event (exclude cancelled)
        const teamRegistrations = await TeamRegistration.find({ eventId, status: { $ne: 'cancelled' } })
        const teams = []
        for (const teamReg of teamRegistrations) {
            const leader = await participant.findById(teamReg.teamLeaderId)
            const enrichedMembers = []
            for (const m of teamReg.teamMembers) {
                const memberUser = await participant.findById(m.participantId)
                enrichedMembers.push({
                    participantId: m.participantId,
                    name: m.name,
                    email: m.email,
                    status: m.status,
                    joinedAt: m.joinedAt,
                    firstName: memberUser?.firstName || '',
                    lastName: memberUser?.lastName || '',
                    participantType: memberUser?.participantType || '',
                    organizationName: memberUser?.orgName || '',
                })
            }
            teams.push({
                _id: teamReg._id,
                teamName: teamReg.teamName,
                teamStatus: teamReg.teamStatus,
                teamSize: teamReg.teamSize,
                ticketId: teamReg.ticketId,
                leaderName: leader ? `${leader.firstName} ${leader.lastName}` : 'Unknown',
                leaderEmail: leader?.email || '',
                leaderParticipantType: leader?.participantType || '',
                leaderOrganizerName: leader?.organizerName || '',
                teamMembers: enrichedMembers,
            })
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Event participants retrieved.",
            response: {

                event: {
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
                    eventTags: event.eventTags,
                    status,
                    allowTeamRegistration: event.allowTeamRegistration || false,
                    minTeamSize: event.minTeamSize || 2,
                    maxTeamSize: event.maxTeamSize || 4,
                },
                analytics: {
                    totalRegistrations: totalRegs,
                    totalRevenue,
                    totalAttendance,
                    totalTeams: teamRegistrations.length,
                },
                participants,
                teams,
            },
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

// ─── QR SCAN - VALIDATE & MARK ATTENDANCE ─────────────────────────
organizerRouter.post('/scan-qr/:eventId', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const { ticketId, scanMethod } = req.body
        const eventId = req.params.eventId

        if (!ticketId) {
            return res.status(400).json({ msgType: "Error", msg: "Ticket ID is required." })
        }

        // Verify event belongs to organizer
        let event = await normalEvent.findById(eventId) || await merchandiseEvent.findById(eventId)
        if (!event) {
            return res.status(404).json({ msgType: "Error", msg: "Event not found." })
        }
        if (event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        // Only allow attendance during the event (between start and end dates)
        const now = new Date()
        const startDate = new Date(event.eventStartDate)
        const endDate = new Date(event.eventEndDate)
        if (now < startDate || now > endDate) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Attendance can only be marked during the event (between start and end dates)."
            })
        }

        // Find registration by ticketId and eventId
        const reg = await Registration.findOne({ ticketId, eventId })
        if (!reg) {
            return res.status(404).json({
                msgType: "Error",
                msg: "Invalid ticket.",
                error: "No registration found with this ticket ID for this event."
            })
        }

        if (reg.status === 'cancelled') {
            return res.status(400).json({
                msgType: "Error",
                msg: "This registration has been cancelled."
            })
        }

        // Check for duplicate scan
        if (reg.attendance) {
            // Find last scan log
            const lastLog = await AttendanceLog.findOne({
                registrationId: reg._id,
                action: 'scan',
            }).sort({ timestamp: -1 })

            return res.status(409).json({
                msgType: "Error",
                msg: "Duplicate scan - already checked in.",
                duplicate: true,
                attendanceTime: lastLog?.timestamp || reg.updatedAt,
            })
        }

        // Mark attendance
        reg.attendance = true
        await reg.save()

        // Log the scan
        const log = new AttendanceLog({
            eventId,
            registrationId: reg._id,
            participantId: reg.participantId,
            ticketId: reg.ticketId,
            action: 'scan',
            performedBy: req.userData._id,
            scanMethod: scanMethod || 'qr-camera',
        })
        await log.save()

        // Get participant info
        const p = await participant.findById(reg.participantId)

        return res.status(200).json({
            msgType: "Success",
            msg: "Attendance marked successfully!",
            participant: {
                name: p ? `${p.firstName} ${p.lastName}` : 'Unknown',
                email: p?.email || 'Unknown',
                ticketId: reg.ticketId,
                registrationDate: reg.createdAt,
                attendanceTime: new Date(),
            }
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Scan failed.", error: err.message })
    }
})

// ─── MANUAL OVERRIDE ATTENDANCE ───────────────────────────────────
organizerRouter.put('/manual-attendance/:registrationId', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const { action, reason } = req.body  // action: 'mark' or 'unmark'
        const reg = await Registration.findById(req.params.registrationId)
        if (!reg) {
            return res.status(404).json({ msgType: "Error", msg: "Registration not found." })
        }

        // Verify event belongs to organizer
        let event = await normalEvent.findById(reg.eventId) || await merchandiseEvent.findById(reg.eventId)
        if (!event || event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        // Only allow attendance during the event (between start and end dates)
        const now = new Date()
        const startDate = new Date(event.eventStartDate)
        const endDate = new Date(event.eventEndDate)
        if (now < startDate || now > endDate) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Attendance can only be marked during the event (between start and end dates)."
            })
        }

        const newAttendance = action === 'mark'
        reg.attendance = newAttendance
        await reg.save()

        // Audit log
        const log = new AttendanceLog({
            eventId: reg.eventId,
            registrationId: reg._id,
            participantId: reg.participantId,
            ticketId: reg.ticketId,
            action: newAttendance ? 'manual-mark' : 'manual-unmark',
            performedBy: req.userData._id,
            reason: reason || 'Manual override',
            scanMethod: 'manual',
        })
        await log.save()

        return res.status(200).json({
            msgType: "Success",
            msg: `Attendance ${newAttendance ? 'marked' : 'unmarked'} (manual override).`,
            attendance: newAttendance,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// ─── LIVE ATTENDANCE DASHBOARD ────────────────────────────────────
organizerRouter.get('/attendance-dashboard/:eventId', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const eventId = req.params.eventId
        let event = await normalEvent.findById(eventId) || await merchandiseEvent.findById(eventId)
        if (!event) {
            return res.status(404).json({ msgType: "Error", msg: "Event not found." })
        }
        if (event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        const registrations = await Registration.find({ eventId, status: 'confirmed' })
        const scanned = []
        const notScanned = []

        for (const reg of registrations) {
            const p = await participant.findById(reg.participantId)
            const entry = {
                _id: reg._id,
                ticketId: reg.ticketId,
                participantName: p ? `${p.firstName} ${p.lastName}` : 'Unknown',
                participantEmail: p?.email || 'Unknown',
                attendance: reg.attendance,
                registrationDate: reg.createdAt,
            }

            if (reg.attendance) {
                // Get scan timestamp
                const log = await AttendanceLog.findOne({
                    registrationId: reg._id,
                }).sort({ timestamp: -1 })
                entry.attendanceTime = log?.timestamp || reg.updatedAt
                entry.scanMethod = log?.scanMethod || 'unknown'
                scanned.push(entry)
            } else {
                notScanned.push(entry)
            }
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Attendance dashboard.",
            dashboard: {
                eventName: event.eventName,
                totalRegistrations: registrations.length,
                scannedCount: scanned.length,
                notScannedCount: notScanned.length,
                scanned,
                notScanned,
            }
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// ─── EXPORT ATTENDANCE CSV ────────────────────────────────────────
organizerRouter.get('/attendance-csv/:eventId', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const eventId = req.params.eventId
        let event = await normalEvent.findById(eventId) || await merchandiseEvent.findById(eventId)
        if (!event) {
            return res.status(404).json({ msgType: "Error", msg: "Event not found." })
        }
        if (event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        const registrations = await Registration.find({ eventId, status: 'confirmed' })
        const headers = ['Name', 'Email', 'Ticket ID', 'Registration Date', 'Attendance', 'Attendance Time', 'Scan Method']
        const rows = []

        for (const reg of registrations) {
            const p = await participant.findById(reg.participantId)
            const log = await AttendanceLog.findOne({ registrationId: reg._id }).sort({ timestamp: -1 })

            rows.push([
                p ? `${p.firstName} ${p.lastName}` : 'Unknown',
                p?.email || 'Unknown',
                reg.ticketId,
                new Date(reg.createdAt).toLocaleString(),
                reg.attendance ? 'Present' : 'Absent',
                log?.timestamp ? new Date(log.timestamp).toLocaleString() : '',
                log?.scanMethod || '',
            ])
        }

        const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${event.eventName.replace(/[^a-zA-Z0-9]/g, '_')}_attendance.csv"`)
        return res.send(csvContent)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// ─── ATTENDANCE AUDIT LOG ─────────────────────────────────────────
organizerRouter.get('/attendance-log/:eventId', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const eventId = req.params.eventId
        let event = await normalEvent.findById(eventId) || await merchandiseEvent.findById(eventId)
        if (!event || event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        const logs = await AttendanceLog.find({ eventId }).sort({ timestamp: -1 }).limit(200)

        return res.status(200).json({
            msgType: "Success",
            msg: "Audit log.",
            logs,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

// ─── UPDATE EVENT STATUS ──────────────────────────────────────────
organizerRouter.put('/close-event/:id', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({ 
                msgType: "Error", 
                msg: "Permission denied.",
                error: "Only Organizers have permission to close the event."
            })
        }
        const eventId = req.params.id

        let event = await normalEvent.findById(eventId) ||
            await merchandiseEvent.findById(eventId)

        if (!event) {
            return res.status(404).json({ 
                msgType: "Error", 
                msg: "Event not found." ,
                error: `Do not exist any event with ${eventId}`

            })
        }

        if (event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ 
                msgType: "Error", 
                msg: "Access denied.",
                error: "Only Organizer who has created this event can close this event."
            })
        }

        event.eventEndDate = new Date()
        event.isEdit = true
        await event.save()

        return res.status(200).json({
            msgType: "Success",
            msg: `Event closed.`,
            response: event,
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

// ─── MARK ATTENDANCE ──────────────────────────────────────────────
organizerRouter.put('/mark-attendance/:registrationId', async (req, res) => {
    try {
        if (req.userData.role !== 'Organizer') {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const reg = await Registration.findById(req.params.registrationId)
        if (!reg) {
            return res.status(404).json({ msgType: "Error", msg: "Registration not found." })
        }

        // Verify event belongs to this organizer
        let event = await normalEvent.findById(reg.eventId) ||
            await merchandiseEvent.findById(reg.eventId)
        if (!event || event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        // Only allow attendance during the event (between start and end dates)
        const now = new Date()
        const startDate = new Date(event.eventStartDate)
        const endDate = new Date(event.eventEndDate)
        if (now < startDate || now > endDate) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Attendance can only be marked during the event (between start and end dates)."
            })
        }

        reg.attendance = !reg.attendance
        await reg.save()

        return res.status(200).json({
            msgType: "Success",
            msg: `Attendance ${reg.attendance ? 'marked' : 'unmarked'}.`,
            attendance: reg.attendance,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
})

export default organizerRouter