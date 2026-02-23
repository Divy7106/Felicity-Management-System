import { useContext, useEffect, useState } from "react"
import { UserContext } from "../contexts/UserContexts"
import { useNavigate } from "react-router-dom"

function RoleCheckLayer({allowedRoles, children}) {
    const { userData } = useContext(UserContext)
    const navigate = useNavigate()
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        // Wait a bit for userData to load from App.jsx useEffect
        const timer = setTimeout(() => {
            setIsChecking(false)
        }, 100)

        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (!isChecking) {
            // No user data = not authenticated
            if (!userData || Object.keys(userData).length === 0) {
                navigate('/login')
            }
            // User authenticated but wrong role
            else if (userData.role && !allowedRoles.includes(userData.role)) {
                if(userData.role === 'Participant') {
                    navigate('/participant-dashboard')
                } else if(userData.role === 'Organizer') {
                    navigate('/organizer-dashboard')
                } else {
                    navigate('/admin-dashboard')
                }
            }
        }
    }, [userData, allowedRoles, navigate, isChecking])

    // Show loading or nothing while checking
    if (isChecking || !userData || Object.keys(userData).length === 0) {
        return null
    }

    // Wrong role - don't render (will redirect)
    if (!allowedRoles.includes(userData.role)) {
        return null
    }

    return children
}

export default RoleCheckLayer