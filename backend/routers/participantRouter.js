import express from "express"
import multer from "multer"
import {
    onboarding,
    getTopOrganizers,
    getMyRegistrations,
    browseEvents,
    getTrendingEvents,
    getEventDetails,
    registerForEvent,
    purchaseMerchandise,
    getTicketDetails,
    cancelRegistration,
    getOrganizers,
    toggleFollow,
    getOrganizerDetail,
    createTeam,
    getTeamInvites,
    respondToInvite,
    getMyTeams,
    uploadTeamChatFile,
    getUnreadCounts,
    getTeamChatHistory,
    exportCalendar,
    exportCalendarBatch,
} from "../controllers/participantController.js"

const participantRouter = express.Router()

const uploadRegFiles = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
})

const chatFileFilter = (req, file, cb) => {
    const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (ext === ".pdf") {
        cb(null, true)
    } else {
        cb(new Error("Only PDF files are allowed."), false)
    }
}

const uploadChatFile = multer({
    storage: multer.memoryStorage(),
    fileFilter: chatFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
})

// Participant routes
participantRouter.post("/onboarding", onboarding)
participantRouter.get("/top-organizers", getTopOrganizers)
participantRouter.get("/my-registrations", getMyRegistrations)
participantRouter.get("/browse-events", browseEvents)
participantRouter.get("/trending-events", getTrendingEvents)
participantRouter.get("/event/:id", getEventDetails)
participantRouter.post("/register/:eventId", uploadRegFiles.any(), registerForEvent)
participantRouter.post("/purchase/:eventId", purchaseMerchandise)
participantRouter.get("/ticket/:ticketId", getTicketDetails)
participantRouter.put("/cancel-registration/:id", cancelRegistration)
participantRouter.get("/organizers", getOrganizers)
participantRouter.post("/toggle-follow/:organizerId", toggleFollow)
participantRouter.get("/organizer/:id", getOrganizerDetail)

// Team registration routes
participantRouter.post("/team/create/:eventId", uploadRegFiles.any(), createTeam)
participantRouter.get("/team/invites", getTeamInvites)
participantRouter.post("/team/respond/:teamRegId", respondToInvite)
participantRouter.get("/team/my-teams", getMyTeams)
participantRouter.post("/team/chat/upload/:teamRegId", uploadChatFile.single("file"), uploadTeamChatFile)
participantRouter.get("/team/unread-counts", getUnreadCounts)
participantRouter.get("/team/chat/:teamRegId", getTeamChatHistory)

// Calendar export routes
participantRouter.get("/calendar/export/:eventId", exportCalendar)
participantRouter.post("/calendar/export-batch", exportCalendarBatch)

export default participantRouter
