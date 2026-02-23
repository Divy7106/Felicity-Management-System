import { useContext } from "react"
import { UserContext } from "../contexts/UserContexts"
import { OrganizerDashBoard } from "../components/organizerComponents/OrganizerDashBoard"
import { ParticipantDashboard, AdminDashboard } from "../components"

function DashBoard() {
    const {userData, updateUserData} = useContext(UserContext)
    return (
        <div className="min-h-screen w-full bg-stone-900">
            {userData.role === 'Organizer' &&
                <OrganizerDashBoard />
            }
            {userData.role === 'Participant' &&
                <ParticipantDashboard />
            }
            {userData.role === 'Admin' &&
                <AdminDashboard />
            }
        </div>
    )
}

export default DashBoard