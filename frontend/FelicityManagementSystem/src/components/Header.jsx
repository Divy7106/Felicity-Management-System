import { useContext, useState, useEffect } from "react"
import { UserContext } from "../contexts/UserContexts"
import { NavLink, useLocation } from "react-router-dom"
import Button from "./Button"
import { logOutUser } from "../services/auth"
import logo from '../assets/Felicity_Logo_Light.png'

function Header() {

    const { userData, updateUserData } = useContext(UserContext)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const location = useLocation()

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false)
    }, [location.pathname])

    // Prevent body scroll when sidebar is open
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [sidebarOpen])

    const menuBar = {
        participant: {
            dashBoard: {
                name: "DashBoard",
                link: "/participant-dashboard",
            },
            browseEvents: {
                name: "Browse Events",
                link: "/browse-events",
            },
            clubsAndOrganizer: {
                name: "Clubs And Organizer",
                link: "/clubs-and-organizer",
            },
            profile: {
                name: "Profile",
                link: "/profile",
            }
        },
        organizer: {
            dashBoard: {
                name: "DashBoard",
                link: "/organizer-dashboard",
            },
            profile: {
                name: "Profile",
                link: "/profile",
            },
            createEvents: {
                name: "Create Events",
                link: "/create-event",
            },
            ongoingEvents: {
                name: "On Going Events",
                link: "/ongoing-events",
            }
        },
        admin: {
            dashBoard: {
                name: "DashBoard",
                link: "/admin-dashboard",
            },
            manageClubsAndOrganizer: {
                name: "Manage Clubs/Organizer",
                link: "/manage-clubs-and-organizer",
            },
            passwordResetRequest: {
                name: "Password Reset Requests",
                link: "/password-reset-request"
            }
        }
    }

    const userMenus = (userData.role === "Participant") ?
        menuBar.participant : ((userData.role === 'Organizer')
            ? menuBar.organizer : menuBar.admin)

    const logOut = async () => {
        await logOutUser()
        updateUserData({})
    }

    return (
        <>
            {/* Desktop Header */}
            <div className="hidden md:flex w-full h-17 bg-stone-900 justify-between items-center shrink-0">
                <img
                    src={logo}
                    className="w-29 h-12 ml-8 mt-3"
                />
                <div className="flex items-center justify-around">

                    {
                        Object.keys(userMenus).map(function (key) {
                            return (
                                <NavLink
                                    className={({ isActive }) => `px-5 text-lg ${isActive ? "text-orange-400" : "text-white"}`}
                                    key={key} to={userMenus[key].link}>
                                    {userMenus[key].name}
                                </NavLink>
                            )
                        })
                    }

                    <Button
                        className="text-lg mr-2 ml-1 h-10 px-4" variant="primary"
                        isbaseStyles={false}
                        onClick={logOut}
                    >
                        Logout
                    </Button>
                </div>
            </div>

            {/* Mobile Header Bar */}
            <div className="flex md:hidden w-full h-14 bg-stone-900 justify-between items-center px-4 shrink-0">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="text-white p-2 cursor-pointer"
                    aria-label="Open menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <span className="text-orange-400 text-lg font-semibold">Felicity</span>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <div className={`fixed top-0 left-0 h-full w-72 bg-stone-900 z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                {/* Sidebar Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-700">
                    <span className="text-orange-400 text-xl font-bold">Felicity</span>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="text-stone-400 hover:text-white p-1 cursor-pointer"
                        aria-label="Close menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Role Badge */}
                <div className="px-5 py-3">
                    <span className="text-xs bg-orange-400/20 text-orange-400 px-3 py-1 rounded-full font-medium">
                        {userData.role}
                    </span>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                    {Object.keys(userMenus).map(function (key) {
                        return (
                            <NavLink
                                className={({ isActive }) => `block px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive
                                        ? "text-orange-400 bg-stone-800"
                                        : "text-stone-300 hover:text-white hover:bg-stone-800"
                                    }`}
                                key={key}
                                to={userMenus[key].link}
                            >
                                {userMenus[key].name}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Logout */}
                <div className="px-4 py-4 border-t border-stone-700">
                    <Button
                        className="text-base w-full h-10 px-4" variant="primary"
                        isbaseStyles={false}
                        onClick={logOut}
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </>
    )


}

export default Header;