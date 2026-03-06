import normalEvent from "../schema/eventSchema/normalEvent.js"
import merchandiseEvent from "../schema/eventSchema/merchandiseEventSchema.js"
import Registration from "../schema/registrationSchema/registrationSchema.js"
import { TeamRegistration } from "../schema/registrationSchema/index.js"
import { participant, organizer } from "../schema/userSchema/index.js"
import AttendanceLog from "../schema/registrationSchema/attendanceLogSchema.js"
import { saveFile, deleteFile } from "../services/fileStorage.js"

// Sends a Discord embed notification when an event is published
export async function sendDiscordWebhook(webhookUrl, event, organizerName) {
    if (!webhookUrl) return
    try {
        const embed = {
            title: `🎉 New Event: ${event.eventName}`,
            description: event.eventdescription || "No description.",
            color: event.eventType === "Merchandise" ? 0x9b59b6 : 0x3498db,
            fields: [
                { name: "Type", value: event.eventType, inline: true },
                { name: "Eligibility", value: event.eligibility || "All", inline: true },
                { name: "Fee", value: event.registrationFee > 0 ? `₹${event.registrationFee}` : "Free", inline: true },
                { name: "Registration Deadline", value: new Date(event.registrationDeadline).toLocaleString(), inline: false },
                { name: "Event Dates", value: `${new Date(event.eventStartDate).toLocaleDateString()} – ${new Date(event.eventEndDate).toLocaleDateString()}`, inline: false },
            ],
            footer: { text: `Organized by ${organizerName}` },
            timestamp: new Date().toISOString(),
        }
        if (event.eventTags?.length > 0) {
            embed.fields.push({ name: "Tags", value: event.eventTags.join(", "), inline: false })
        }
        await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] }),
        })
    } catch (err) {
        console.error("Discord webhook failed:", err.message)
    }
}

// Creates and publishes a new event (Normal or Merchandise) with image uploads
export const createEvent = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only organizers can create events.",
            })
        }
        const body = JSON.parse(req.body.eventData || "{}")
        const eventType = body.eventType || "Normal"
        console.log(eventType, body.eventType)

        if (body.isDraft === true || body.isDraft === "true") {
            return res.status(403).json({
                msgType: "Error",
                msg: "Use /create-event-draft to save drafts",
                error: "Invalid path to save draft.",
            })
        }

        var draft = null
        if (body.wasDraft === true || body.wasDraft === "true") {
            draft = (await normalEvent.findById(body.id)) || (await merchandiseEvent.findById(body.id))
            if (draft) {
                delete body.id
            }
        }

        body.organizerId = req.userData._id

        const coverImageFile = req.files.find((f) => f.fieldname === "coverImage")
        if (coverImageFile) {
            body.coverImage = await saveFile(coverImageFile.buffer, coverImageFile.originalname, coverImageFile.mimetype, "event")
            if (draft && draft.coverImage) {
                deleteFile(draft.coverImage)
            }
        } else if (body.coverImage && draft) {
            // keep existing coverImage URL from draft
        } else {
            return res.status(400).json({
                msgType: "Error",
                msg: "Cover image is required.",
                error: "coverImage field is missing.",
            })
        }

        if (body.merchandiseItems && Array.isArray(body.merchandiseItems)) {
            for (let i = 0; i < body.merchandiseItems.length; i++) {
                const item = body.merchandiseItems[i]
                if (item.variants && Array.isArray(item.variants)) {
                    for (let j = 0; j < item.variants.length; j++) {
                        const variantImageFile = req.files.find(
                            (f) => f.fieldname === `merchandiseItems[${i}][variants][${j}][coverImage]`
                        )
                        if (variantImageFile) {
                            body.merchandiseItems[i].variants[j].coverImage = await saveFile(variantImageFile.buffer, variantImageFile.originalname, variantImageFile.mimetype, "event")
                        } else if (body.merchandiseItems[i]?.variants[j]?.coverImage) {
                            // keep existing URL from draft
                        } else if (eventType === "Merchandise") {
                            return res.status(400).json({
                                msgType: "Error",
                                msg: `Cover image is required for item ${i + 1}, variant ${j + 1}.`,
                                error: `Missing variant image for ${item.name}`,
                            })
                        }
                    }
                }
            }
        }

        if (body.eventName) {
            const existingEvent =
                (await normalEvent.findOne({ eventName: body.eventName, organizerId: body.organizerId })) ||
                (await merchandiseEvent.findOne({ eventName: body.eventName, organizerId: body.organizerId }))

            if (existingEvent && !existingEvent.isDraft) {
                const now = new Date()
                const eventEndDate = new Date(existingEvent.eventEndDate)
                if (now <= eventEndDate) {
                    return res.status(400).json({
                        msgType: "Error",
                        msg: "Event with the same name already exists.",
                        error: "An active event with this name already exists for your organization.",
                    })
                }
            }
        }

        if (eventType === "Normal") {
            const newEvent = new normalEvent(body)
            await newEvent.save()

            if (draft) {
                (await normalEvent.findByIdAndDelete(draft._id)) || (await merchandiseEvent.findByIdAndDelete(draft._id))
            }

            const org = await organizer.findById(req.userData._id)
            if (org?.discordWebhook) {
                sendDiscordWebhook(org.discordWebhook, newEvent, org.organizerName)
            }

            return res.status(201).json({
                msgType: "Success",
                msg: "Normal event created successfully.",
                response: newEvent,
            })
        } else if (eventType === "Merchandise") {
            const newEvent = new merchandiseEvent(body)
            await newEvent.save()

            if (draft) {
                (await normalEvent.findByIdAndDelete(draft._id)) || (await merchandiseEvent.findByIdAndDelete(draft._id))
            }

            const org = await organizer.findById(req.userData._id)
            if (org?.discordWebhook) {
                sendDiscordWebhook(org.discordWebhook, newEvent, org.organizerName)
            }

            return res.status(201).json({
                msgType: "Success",
                msg: "Merchandise event created successfully.",
                response: newEvent,
            })
        } else {
            return res.status(400).json({
                msgType: "Error",
                msg: "Invalid event type.",
                error: "eventType must be either 'Normal' or 'Merchandise'.",
            })
        }
    } catch (error) {
        console.log(error)
        // files are in memory only, nothing to clean up on error
        return res.status(500).json({
            msgType: "Error",
            msg: "Failed to create event.",
            error: error.message,
        })
    }
}

// Saves an event as a draft (can be resumed later)
export const createEventDraft = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only organizers can create events.",
            })
        }
        const body = JSON.parse(req.body.eventData || "{}")
        const eventType = body.eventType ? "Normal" : ""
        delete body.eventType
        var prev_draft = null

        if (body.isDraft === false || body.isDraft === "false") {
            return res.status(403).json({
                msgType: "Error",
                msg: "Use /create-event to save events",
                error: "Invalid path to save events.",
            })
        }

        body.isDraft = true

        if (body.wasDraft === true || body.wasDraft === "true") {
            prev_draft = (await normalEvent.findById(body.id)) || (await merchandiseEvent.findById(body.id))
        }

        body.organizerId = req.userData._id

        const coverImageFile = req.files.find((f) => f.fieldname === "coverImage")
        if (coverImageFile) {
            body.coverImage = await saveFile(coverImageFile.buffer, coverImageFile.originalname, coverImageFile.mimetype, "event")
            if (prev_draft && prev_draft.coverImage) {
                deleteFile(prev_draft.coverImage)
            }
        } else if (body.coverImage && prev_draft) {
            // keep existing URL from previous draft
        }

        if (body.merchandiseItems && Array.isArray(body.merchandiseItems)) {
            for (let i = 0; i < body.merchandiseItems.length; i++) {
                const item = body.merchandiseItems[i]
                if (item.variants && Array.isArray(item.variants)) {
                    for (let j = 0; j < item.variants.length; j++) {
                        const variantImageFile = req.files.find(
                            (f) => f.fieldname === `merchandiseItems[${i}][variants][${j}][coverImage]`
                        )
                        if (variantImageFile) {
                            body.merchandiseItems[i].variants[j].coverImage = await saveFile(variantImageFile.buffer, variantImageFile.originalname, variantImageFile.mimetype, "event")
                        } else if (body.merchandiseItems[i]?.variants[j]?.coverImage) {
                            // keep existing URL from previous draft
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
                response: prev_draft,
            })
        }

        if (eventType === "Normal") {
            const newEvent = new normalEvent(body)
            await newEvent.save()
            return res.status(201).json({
                msgType: "Success",
                msg: "Normal event created successfully.",
                reponse: newEvent,
            })
        } else if (eventType === "Merchandise") {
            const newEvent = new merchandiseEvent(body)
            await newEvent.save()
            return res.status(201).json({
                msgType: "Success",
                msg: "Merchandise event created successfully.",
                response: newEvent,
            })
        } else {
            return res.status(400).json({
                msgType: "Error",
                msg: "Invalid event type.",
                error: "eventType must be either 'Normal' or 'Merchandise'.",
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            msgType: "Error",
            msg: "Failed to create event.",
            error: error.message,
        })
    }
}

// Returns minimal event list for the organizer's dashboard
export const getOrgMinEvents = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only organizers can access their events.",
            })
        }

        const organizerId = req.userData._id
        const normalEvents = await normalEvent.find({ organizerId })
        const merchEvents = await merchandiseEvent.find({ organizerId })
        const allEvents = [...normalEvents, ...merchEvents]

        const currentDate = new Date()
        const minimalEvents = allEvents.map((event) => {
            let status = ""
            let isDraftFlag = event.isDraft || false

            if (isDraftFlag) {
                status = "draft"
            } else {
                const startDate = new Date(event.eventStartDate)
                const endDate = new Date(event.eventEndDate)
                if (currentDate < startDate) status = "published"
                else if (currentDate >= startDate && currentDate <= endDate) status = "onGoing"
                else status = "closed"
            }

            let description = event.eventdescription || ""
            if (description.length > 40) {
                description = description.substring(0, 40) + "..."
            }

            return {
                _id: event._id,
                eventName: event.eventName || "Untitled Draft",
                eventDescription: description,
                eventType: event.eventType,
                coverImage: event.coverImage,
                status: status,
                isDraft: isDraftFlag,
            }
        })

        return res.status(200).json({
            msgType: "Success",
            msg: "Events retrieved successfully.",
            events: minimalEvents,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({
            msgType: "Error",
            msg: "Failed to retrieve events.",
            error: err.message,
        })
    }
}

// Returns full event details by ID (organizer must own the event)
export const getOrgMaxEvent = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only organizers can access event details.",
            })
        }

        const eventId = req.params.id
        const organizerId = req.userData._id

        let event = (await normalEvent.findById(eventId)) || (await merchandiseEvent.findById(eventId))

        if (!event) {
            return res.status(404).json({
                msgType: "Error",
                msg: "Event not found.",
                error: "No event found with the provided ID.",
            })
        }

        if (event.organizerId.toString() !== organizerId.toString()) {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "You do not have access to this event.",
            })
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Event retrieved successfully.",
            response: event,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({
            msgType: "Error",
            msg: "Failed to retrieve event.",
            error: err.message,
        })
    }
}

// Updates editable fields of a published event (description, deadline, limit, formFields)
export const editEventForm = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only organizers can edit events.",
            })
        }

        const eventId = req.params.id
        const organizerId = req.userData._id
        const { eventDescription, registrationDeadline, registrationLimit, closeRegistration, formFields } = req.body

        let event = (await normalEvent.findById(eventId)) || (await merchandiseEvent.findById(eventId))

        if (!event) {
            return res.status(404).json({
                msgType: "Error",
                msg: "Event not found.",
                error: "No event found with the provided ID.",
            })
        }

        if (event.organizerId.toString() !== organizerId.toString()) {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "You do not have access to this event.",
            })
        }

        const now = new Date()
        const eventStartDate = new Date(event.eventStartDate)

        // Block all editing once event has started
        if (now >= eventStartDate) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Cannot edit event.",
                error: "Editing is disabled after the event has started.",
            })
        }

        // Update formFields only if form is not locked (no registrations yet)
        if (formFields !== undefined) {
            if (event.formLocked) {
                return res.status(400).json({
                    msgType: "Error",
                    msg: "Cannot edit registration form.",
                    error: "Registration form is locked after the first registration.",
                })
            }
            event.formFields = formFields
        }

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

        event.isEdit = true
        await event.save()

        return res.status(200).json({
            msgType: "Success",
            msg: "Event updated successfully.",
            response: event,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({
            msgType: "Error",
            msg: "Failed to update event.",
            error: err.message,
        })
    }
}

// Returns aggregate analytics across all organizer's events
export const getEventAnalytics = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
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
            const activeRegs = regs.filter((r) => r.status !== "cancelled")
            totalRegistrations += activeRegs.length
            totalRevenue += activeRegs.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
            totalAttendance += activeRegs.filter((r) => r.attendance).length

            const now = new Date()
            if (new Date(event.eventEndDate) < now) completedEvents++
        }

        return res.status(200).json({
            msgType: "Success",
            msg: "Analytics retrieved.",
            analytics: { totalEvents: allEvents.length, completedEvents, totalRegistrations, totalRevenue, totalAttendance },
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
}

// Returns event details with participant list, team info, and stats
export const getEventParticipants = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only Organizers can access this api.",
            })
        }
        const eventId = req.params.id
        const organizerId = req.userData._id

        let event = (await normalEvent.findById(eventId)) || (await merchandiseEvent.findById(eventId))

        if (!event) {
            return res.status(404).json({
                msgType: "Error",
                msg: "Event not found.",
                error: "Requested Event do not exist.",
            })
        }

        if (event.organizerId.toString() !== organizerId.toString()) {
            return res.status(403).json({
                msgType: "Error",
                msg: "Access denied.",
                error: "This Event cannot be accessed.",
            })
        }

        const registrations = await Registration.find({ eventId })
        const participants = []
        for (const reg of registrations) {
            const p = await participant.findById(reg.participantId)
            participants.push({
                _id: reg._id,
                ticketId: reg.ticketId,
                participantName: p ? `${p.firstName} ${p.lastName}` : "Unknown",
                participantEmail: p?.email || "Unknown",
                registrationDate: reg.createdAt,
                paymentStatus: reg.paymentStatus,
                totalAmount: reg.totalAmount,
                attendance: reg.attendance,
                status: reg.status,
                merchandiseSelections: reg.merchandiseSelections || [],
            })
        }

        const activeRegistrations = registrations.filter((r) => r.status !== "cancelled")
        const totalRegs = activeRegistrations.length
        const totalRevenue = activeRegistrations.reduce((s, r) => s + (r.totalAmount || 0), 0)
        const totalAttendance = activeRegistrations.filter((r) => r.attendance).length

        const now = new Date()
        let status = "draft"
        if (!event.isDraft) {
            const start = new Date(event.eventStartDate)
            const end = new Date(event.eventEndDate)
            if (now < start) status = "published"
            else if (now >= start && now <= end) status = "onGoing"
            else status = "closed"
        }

        const teamRegistrations = await TeamRegistration.find({ eventId, status: { $ne: "cancelled" } })
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
                    firstName: memberUser?.firstName || "",
                    lastName: memberUser?.lastName || "",
                    participantType: memberUser?.participantType || "",
                    organizationName: memberUser?.orgName || "",
                })
            }
            teams.push({
                _id: teamReg._id,
                teamName: teamReg.teamName,
                teamStatus: teamReg.teamStatus,
                teamSize: teamReg.teamSize,
                ticketId: teamReg.ticketId,
                leaderName: leader ? `${leader.firstName} ${leader.lastName}` : "Unknown",
                leaderEmail: leader?.email || "",
                leaderParticipantType: leader?.participantType || "",
                leaderOrganizerName: leader?.organizerName || "",
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
                analytics: { totalRegistrations: totalRegs, totalRevenue, totalAttendance, totalTeams: teamRegistrations.length },
                participants,
                teams,
            },
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
}

// Validates a QR ticket scan and marks attendance with audit logging
export const scanQr = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const { ticketId, scanMethod } = req.body
        const eventId = req.params.eventId

        if (!ticketId) {
            return res.status(400).json({ msgType: "Error", msg: "Ticket ID is required." })
        }

        let event = (await normalEvent.findById(eventId)) || (await merchandiseEvent.findById(eventId))
        if (!event) {
            return res.status(404).json({ msgType: "Error", msg: "Event not found." })
        }
        if (event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        const now = new Date()
        const startDate = new Date(event.eventStartDate)
        const endDate = new Date(event.eventEndDate)
        if (now < startDate || now > endDate) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Attendance can only be marked during the event (between start and end dates).",
            })
        }

        const reg = await Registration.findOne({ ticketId, eventId })
        if (!reg) {
            return res.status(404).json({
                msgType: "Error",
                msg: "Invalid ticket.",
                error: "No registration found with this ticket ID for this event.",
            })
        }

        if (reg.status === "cancelled") {
            return res.status(400).json({ msgType: "Error", msg: "This registration has been cancelled." })
        }

        if (reg.attendance) {
            const lastLog = await AttendanceLog.findOne({ registrationId: reg._id, action: "scan" }).sort({ timestamp: -1 })
            return res.status(409).json({
                msgType: "Error",
                msg: "Duplicate scan - already checked in.",
                duplicate: true,
                attendanceTime: lastLog?.timestamp || reg.updatedAt,
            })
        }

        reg.attendance = true
        await reg.save()

        const log = new AttendanceLog({
            eventId,
            registrationId: reg._id,
            participantId: reg.participantId,
            ticketId: reg.ticketId,
            action: "scan",
            performedBy: req.userData._id,
            scanMethod: scanMethod || "qr-camera",
        })
        await log.save()

        const p = await participant.findById(reg.participantId)

        return res.status(200).json({
            msgType: "Success",
            msg: "Attendance marked successfully!",
            participant: {
                name: p ? `${p.firstName} ${p.lastName}` : "Unknown",
                email: p?.email || "Unknown",
                ticketId: reg.ticketId,
                registrationDate: reg.createdAt,
                attendanceTime: new Date(),
            },
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Scan failed.", error: err.message })
    }
}

// Manually marks or unmarks attendance with reason logging
export const manualAttendance = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const { action, reason } = req.body
        const reg = await Registration.findById(req.params.registrationId)
        if (!reg) {
            return res.status(404).json({ msgType: "Error", msg: "Registration not found." })
        }

        let event = (await normalEvent.findById(reg.eventId)) || (await merchandiseEvent.findById(reg.eventId))
        if (!event || event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        const now = new Date()
        const startDate = new Date(event.eventStartDate)
        const endDate = new Date(event.eventEndDate)
        if (now < startDate || now > endDate) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Attendance can only be marked during the event (between start and end dates).",
            })
        }

        const newAttendance = action === "mark"
        reg.attendance = newAttendance
        await reg.save()

        const log = new AttendanceLog({
            eventId: reg.eventId,
            registrationId: reg._id,
            participantId: reg.participantId,
            ticketId: reg.ticketId,
            action: newAttendance ? "manual-mark" : "manual-unmark",
            performedBy: req.userData._id,
            reason: reason || "Manual override",
            scanMethod: "manual",
        })
        await log.save()

        return res.status(200).json({
            msgType: "Success",
            msg: `Attendance ${newAttendance ? "marked" : "unmarked"} (manual override).`,
            attendance: newAttendance,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
}

// Returns attendance dashboard with scanned/not-scanned participant lists
export const getAttendanceDashboard = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const eventId = req.params.eventId
        let event = (await normalEvent.findById(eventId)) || (await merchandiseEvent.findById(eventId))
        if (!event) {
            return res.status(404).json({ msgType: "Error", msg: "Event not found." })
        }
        if (event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        const registrations = await Registration.find({ eventId, status: "confirmed" })
        const scanned = []
        const notScanned = []

        for (const reg of registrations) {
            const p = await participant.findById(reg.participantId)
            const entry = {
                _id: reg._id,
                ticketId: reg.ticketId,
                participantName: p ? `${p.firstName} ${p.lastName}` : "Unknown",
                participantEmail: p?.email || "Unknown",
                attendance: reg.attendance,
                registrationDate: reg.createdAt,
            }

            if (reg.attendance) {
                const log = await AttendanceLog.findOne({ registrationId: reg._id }).sort({ timestamp: -1 })
                entry.attendanceTime = log?.timestamp || reg.updatedAt
                entry.scanMethod = log?.scanMethod || "unknown"
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
            },
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
}

// Exports attendance data as a downloadable CSV file
export const getAttendanceCsv = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const eventId = req.params.eventId
        let event = (await normalEvent.findById(eventId)) || (await merchandiseEvent.findById(eventId))
        if (!event) {
            return res.status(404).json({ msgType: "Error", msg: "Event not found." })
        }
        if (event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        const registrations = await Registration.find({ eventId, status: "confirmed" })
        const headers = ["Name", "Email", "Ticket ID", "Registration Date", "Attendance", "Attendance Time", "Scan Method"]
        const rows = []

        for (const reg of registrations) {
            const p = await participant.findById(reg.participantId)
            const log = await AttendanceLog.findOne({ registrationId: reg._id }).sort({ timestamp: -1 })

            rows.push([
                p ? `${p.firstName} ${p.lastName}` : "Unknown",
                p?.email || "Unknown",
                reg.ticketId,
                new Date(reg.createdAt).toLocaleString(),
                reg.attendance ? "Present" : "Absent",
                log?.timestamp ? new Date(log.timestamp).toLocaleString() : "",
                log?.scanMethod || "",
            ])
        }

        const csvContent = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n")

        res.setHeader("Content-Type", "text/csv; charset=utf-8")
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${event.eventName.replace(/[^a-zA-Z0-9]/g, "_")}_attendance.csv"`
        )
        return res.send(csvContent)
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
}

// Returns the attendance audit log for an event
export const getAttendanceLog = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const eventId = req.params.eventId
        let event = (await normalEvent.findById(eventId)) || (await merchandiseEvent.findById(eventId))
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
}

// Closes an event by setting its end date to now
export const closeEvent = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({
                msgType: "Error",
                msg: "Permission denied.",
                error: "Only Organizers have permission to close the event.",
            })
        }
        const eventId = req.params.id

        let event = (await normalEvent.findById(eventId)) || (await merchandiseEvent.findById(eventId))

        if (!event) {
            return res.status(404).json({
                msgType: "Error",
                msg: "Event not found.",
                error: `Do not exist any event with ${eventId}`,
            })
        }

        if (event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({
                msgType: "Error",
                msg: "Access denied.",
                error: "Only Organizer who has created this event can close this event.",
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
            error: err.message,
        })
    }
}

// Toggles attendance status for a registration (simple mark/unmark)
export const markAttendance = async (req, res) => {
    try {
        if (req.userData.role !== "Organizer") {
            return res.status(403).json({ msgType: "Error", msg: "Permission denied." })
        }

        const reg = await Registration.findById(req.params.registrationId)
        if (!reg) {
            return res.status(404).json({ msgType: "Error", msg: "Registration not found." })
        }

        let event = (await normalEvent.findById(reg.eventId)) || (await merchandiseEvent.findById(reg.eventId))
        if (!event || event.organizerId.toString() !== req.userData._id.toString()) {
            return res.status(403).json({ msgType: "Error", msg: "Access denied." })
        }

        const now = new Date()
        const startDate = new Date(event.eventStartDate)
        const endDate = new Date(event.eventEndDate)
        if (now < startDate || now > endDate) {
            return res.status(400).json({
                msgType: "Error",
                msg: "Attendance can only be marked during the event (between start and end dates).",
            })
        }

        reg.attendance = !reg.attendance
        await reg.save()

        return res.status(200).json({
            msgType: "Success",
            msg: `Attendance ${reg.attendance ? "marked" : "unmarked"}.`,
            attendance: reg.attendance,
        })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ msgType: "Error", msg: "Failed.", error: err.message })
    }
}
