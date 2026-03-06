import { Router } from "express"
import multer from "multer"
import {
    createEvent,
    createEventDraft,
    getOrgMinEvents,
    getOrgMaxEvent,
    editEventForm,
    getEventAnalytics,
    getEventParticipants,
    scanQr,
    manualAttendance,
    getAttendanceDashboard,
    getAttendanceCsv,
    getAttendanceLog,
    closeEvent,
    markAttendance,
} from "../controllers/organizerController.js"

const organizerRouter = Router()

// Image file filter for event uploads (PNG, JPEG, JPG only)
const fileFilter = (req, file, cb) => {
    const allowed = [".png", ".jpeg", ".jpg"]
    const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (allowed.includes(ext)) {
        cb(null, true)
    } else {
        cb(new Error(`Invalid file type. Only PNG, JPEG, and JPG files are allowed. Received: ${ext}`), false)
    }
}

const uploadEvent = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
})

organizerRouter.post("/create-event", uploadEvent.any(), createEvent)
organizerRouter.post("/create-event-draft", uploadEvent.any(), createEventDraft)
organizerRouter.get("/get-org-min-events", getOrgMinEvents)
organizerRouter.get("/get-org-max-event/:id", getOrgMaxEvent)
organizerRouter.put("/edit-event-form/:id", editEventForm)
organizerRouter.get("/event-analytics", getEventAnalytics)
organizerRouter.get("/event-participants/:id", getEventParticipants)
organizerRouter.post("/scan-qr/:eventId", scanQr)
organizerRouter.put("/manual-attendance/:registrationId", manualAttendance)
organizerRouter.get("/attendance-dashboard/:eventId", getAttendanceDashboard)
organizerRouter.get("/attendance-csv/:eventId", getAttendanceCsv)
organizerRouter.get("/attendance-log/:eventId", getAttendanceLog)
organizerRouter.put("/close-event/:id", closeEvent)
organizerRouter.put("/mark-attendance/:registrationId", markAttendance)

export default organizerRouter
