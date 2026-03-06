import { Router } from "express"
import {
    createOrganizer,
    getDashboardStats,
    getOrganizers,
    deleteOrganizer,
    getPasswordResetRequests,
    changeOrganizerPassword,
    rejectPasswordReset,
} from "../controllers/adminController.js"

const adminRouter = Router()

adminRouter.post("/create-org", createOrganizer)
adminRouter.get("/dashboard-stats", getDashboardStats)
adminRouter.get("/organizers", getOrganizers)
adminRouter.delete("/delete-organizer/:id", deleteOrganizer)
adminRouter.get("/password-reset-requests", getPasswordResetRequests)
adminRouter.put("/change-organizer-password/:requestId", changeOrganizerPassword)
adminRouter.put("/reject-password-reset/:requestId", rejectPasswordReset)

export default adminRouter