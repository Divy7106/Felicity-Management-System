import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyRegistrations, getTeamInvites, respondToInvite, getMyTeams, exportCalendar, exportCalendarBatch, getGoogleCalendarUrl, getOutlookCalendarUrl, getTeamUnreadCounts, cancelRegistration } from '../../services/participant'
import Button from '../Button'

function ParticipantDashboard() {
    const navigate = useNavigate()
    const [registrations, setRegistrations] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('upcoming')
    const [selectedTicket, setSelectedTicket] = useState(null)

    // Team state
    const [teamInvites, setTeamInvites] = useState([])
    const [myTeams, setMyTeams] = useState([])
    const [respondingTo, setRespondingTo] = useState(null)
    const [unreadCounts, setUnreadCounts] = useState({})
    const [cancellingId, setCancellingId] = useState(null)
    const [confirmCancel, setConfirmCancel] = useState(null) // { type: 'reg'|'team', id, name }

    useEffect(() => {
        fetchRegistrations()
        fetchTeamInvites()
        fetchMyTeams()
        fetchUnreadCounts()
    }, [])

    const fetchRegistrations = async () => {
        try {
            setLoading(true)
            const res = await getMyRegistrations()
            setRegistrations(res.data.registrations || [])
        } catch (err) {
            console.error('Failed to fetch registrations:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchTeamInvites = async () => {
        try {
            const res = await getTeamInvites()
            setTeamInvites(res.data.invites || [])
        } catch (err) {
            console.error('Failed to fetch team invites:', err)
        }
    }

    const fetchMyTeams = async () => {
        try {
            const res = await getMyTeams()
            setMyTeams(res.data.teams || [])
        } catch (err) {
            console.error('Failed to fetch teams:', err)
        }
    }

    const fetchUnreadCounts = async () => {
        try {
            // Get last-read timestamps from localStorage
            const lastRead = JSON.parse(localStorage.getItem('teamChatLastRead') || '{}')
            const res = await getTeamUnreadCounts(lastRead)
            setUnreadCounts(res.data.unreadCounts || {})
        } catch (err) {
            console.error('Failed to fetch unread counts:', err)
        }
    }

    const handleInviteResponse = async (teamRegId, action) => {
        try {
            setRespondingTo(teamRegId)
            await respondToInvite(teamRegId, action)
            await fetchTeamInvites()
            await fetchMyTeams()
            await fetchRegistrations()
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to respond')
        } finally {
            setRespondingTo(null)
        }
    }

    const handleCancelRegistration = async (id, isTeam = false) => {
        try {
            setCancellingId(id)
            await cancelRegistration(id)
            setConfirmCancel(null)
            if (isTeam) await fetchMyTeams()
            await fetchRegistrations()
        } catch (err) {
            alert(err.response?.data?.msg || 'Cancellation failed')
        } finally {
            setCancellingId(null)
        }
    }

    const handleCalendarDownload = async (eventId, eventName) => {
        try {
            const res = await exportCalendar(eventId)
            const blob = new Blob([res.data], { type: 'text/calendar' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}.ics`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Calendar export failed:', err)
        }
    }

    const handleBatchCalendarExport = async () => {
        const eventIds = upcoming.map(r => r.eventId).filter(Boolean)
        if (eventIds.length === 0) return
        try {
            const res = await exportCalendarBatch(eventIds)
            const blob = new Blob([res.data], { type: 'text/calendar' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'felicity_events.ics'
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Batch export failed:', err)
        }
    }

    // Categorize registrations
    const upcoming = registrations.filter(r => r.eventStatus === 'upcoming' && r.status === 'confirmed')
    const normal = registrations.filter(r => r.eventType === 'Normal')
    const merchandise = registrations.filter(r => r.eventType === 'Merchandise')
    const completed = registrations.filter(r => r.eventStatus === 'completed' || r.status === 'completed')
    const cancelled = registrations.filter(r => r.status === 'cancelled' || r.status === 'rejected')

    const tabs = [
        { key: 'upcoming', label: 'Upcoming', data: upcoming },
        { key: 'normal', label: 'Normal', data: normal },
        { key: 'merchandise', label: 'Merchandise', data: merchandise },
        { key: 'completed', label: 'Completed', data: completed },
        { key: 'cancelled', label: 'Cancelled/Rejected', data: cancelled },
        { key: 'team-invites', label: 'Team Invites', data: teamInvites },
        { key: 'my-teams', label: 'My Teams', data: myTeams, hasUnread: Object.keys(unreadCounts).length > 0 },
    ]

    const activeData = tabs.find(t => t.key === activeTab)?.data || []

    const statusColors = {
        confirmed: 'text-green-400',
        completed: 'text-blue-400',
        cancelled: 'text-red-400',
        rejected: 'text-red-400',
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <p className="text-white text-2xl">Loading your events...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen pb-10 px-3 sm:px-5">
            <h1 className="text-white text-2xl sm:text-3xl py-5 font-semibold">My Events</h1>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-stone-800 rounded-lg p-1 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`relative px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === tab.key
                                ? 'bg-orange-400 text-black'
                                : 'text-stone-300 hover:text-white'
                        }`}
                    >
                        {tab.label} ({tab.data.length})
                        {tab.hasUnread && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-stone-800 animate-pulse" />
                        )}
                    </button>
                ))}
            </div>

            {/* Batch Calendar Export for Upcoming */}
            {activeTab === 'upcoming' && upcoming.length > 0 && (
                <div className="mb-4 flex justify-end">
                    <button
                        onClick={handleBatchCalendarExport}
                        className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-2 cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export All to Calendar
                    </button>
                </div>
            )}

            {/* Team Invites Tab */}
            {activeTab === 'team-invites' && (
                teamInvites.length === 0 ? (
                    <div className="flex justify-center items-center h-48">
                        <p className="text-stone-400 text-lg">No pending team invitations.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {teamInvites.map(invite => (
                            <div key={invite.teamRegId} className="bg-stone-800 rounded-xl p-4 sm:p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-white text-lg font-semibold">{invite.teamName}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Pending</span>
                                        </div>
                                        <div className="text-stone-400 text-sm space-y-1">
                                            <p>Event: <span className="text-white">{invite.eventName}</span></p>
                                            <p>From: <span className="text-white">{invite.leaderName}</span> ({invite.leaderEmail})</p>
                                            <p>Date: {new Date(invite.eventStartDate).toLocaleDateString()}</p>
                                            <p>Team Size: {invite.teamSize} members</p>
                                        </div>
                                        {/* Show team members */}
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {invite.teamMembers.map((m, i) => (
                                                <span key={i} className={`text-xs px-2 py-1 rounded-full ${
                                                    m.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                                    m.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-stone-700 text-stone-300'
                                                }`}>
                                                    {m.name} ({m.status})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="primary"
                                            isbaseStyles={false}
                                            className="px-4 py-2"
                                            onClick={() => handleInviteResponse(invite.teamRegId, 'accept')}
                                            disabled={respondingTo === invite.teamRegId}
                                        >
                                            {respondingTo === invite.teamRegId ? '...' : 'Accept'}
                                        </Button>
                                        <Button
                                            variant="custom"
                                            isbaseStyles={false}
                                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30"
                                            onClick={() => handleInviteResponse(invite.teamRegId, 'decline')}
                                            disabled={respondingTo === invite.teamRegId}
                                        >
                                            {respondingTo === invite.teamRegId ? '...' : 'Decline'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* My Teams Tab */}
            {activeTab === 'my-teams' && (
                myTeams.length === 0 ? (
                    <div className="flex justify-center items-center h-48">
                        <p className="text-stone-400 text-lg">No teams yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {myTeams.map(team => (
                            <div key={team._id} className="bg-stone-800 rounded-xl p-4 sm:p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-white text-lg font-semibold">{team.teamName}</h3>
                                            {team.isLeader && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">Leader</span>
                                            )}
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                team.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                team.teamStatus === 'complete' ? 'bg-green-500/20 text-green-400' :
                                                team.teamStatus === 'incomplete' ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                                {team.status === 'cancelled' ? 'cancelled' : team.teamStatus}
                                            </span>
                                        </div>
                                        <div className="text-stone-400 text-sm space-y-1">
                                            <p>Event: <span className="text-white">{team.eventName}</span></p>
                                            <p>Organizer: <span className="text-white">{team.organizerName}</span></p>
                                            <p>Date: {new Date(team.eventStartDate).toLocaleDateString()}</p>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {team.teamMembers.map((m, i) => (
                                                <span key={i} className={`text-xs px-2 py-1 rounded-full ${
                                                    m.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                                    m.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-stone-700 text-stone-300'
                                                }`}>
                                                    {m.name} ({m.status})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        {team.teamStatus === 'complete' && team.status !== 'cancelled' && (
                                            <button
                                                onClick={() => {
                                                    // Mark as read in localStorage
                                                    const lastRead = JSON.parse(localStorage.getItem('teamChatLastRead') || '{}')
                                                    lastRead[team._id] = new Date().toISOString()
                                                    localStorage.setItem('teamChatLastRead', JSON.stringify(lastRead))
                                                    navigate(`/team-chat/${team._id}`)
                                                }}
                                                className="relative text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                                            >
                                                {unreadCounts[team._id] && (
                                                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold px-1">
                                                        {unreadCounts[team._id] > 99 ? '99+' : unreadCounts[team._id]}
                                                    </span>
                                                )}
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                                Team Chat
                                            </button>
                                        )}
                                        {team.ticketId && (
                                            <span className="text-xs text-stone-500 font-mono">{team.ticketId}</span>
                                        )}
                                        {/* Cancel Team (leader only) */}
                                        {team.isLeader && team.teamStatus !== 'incomplete' && team.status !== 'cancelled' && (
                                            <button
                                                onClick={() => setConfirmCancel({ type: 'team', id: team._id, name: team.teamName })}
                                                className="text-xs text-red-400 hover:text-red-300 cursor-pointer flex items-center gap-1 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Cancel Team
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Registration Cards - for standard tabs */}
            {!['team-invites', 'my-teams'].includes(activeTab) && (
            <>
            {activeData.length === 0 ? (
                <div className="flex justify-center items-center h-48">
                    <p className="text-stone-400 text-lg">No events in this category.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {activeData.map(reg => (
                        <div
                            key={reg._id}
                            className="bg-stone-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-stone-750 transition-all gap-3"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                    <h3 className="text-white text-lg font-semibold">{reg.eventName}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        reg.eventType === 'Normal' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                                    }`}>
                                        {reg.eventType}
                                    </span>
                                    <span className={`text-sm font-medium ${statusColors[reg.status] || 'text-stone-400'}`}>
                                        {reg.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-3 sm:gap-6 text-stone-400 text-sm">
                                    <span>Organizer: {reg.organizerName}</span>
                                    <span>Date: {new Date(reg.eventStartDate).toLocaleDateString()}</span>
                                    {reg.totalAmount > 0 && <span>Amount: ₹{reg.totalAmount}</span>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Calendar dropdown */}
                                {reg.eventStatus === 'upcoming' && reg.status !== 'cancelled' && (
                                    <div className="relative group">
                                        <button className="text-stone-400 hover:text-orange-400 cursor-pointer p-1 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                        <div className="absolute right-0 top-full mt-1 bg-stone-700 rounded-lg shadow-xl py-2 px-3 z-10 hidden group-hover:block min-w-40">
                                            <button
                                                onClick={() => handleCalendarDownload(reg.eventId, reg.eventName)}
                                                className="text-xs text-stone-300 hover:text-orange-400 block py-1 w-full text-left cursor-pointer"
                                            >
                                                Download .ics
                                            </button>
                                            <a
                                                href={getGoogleCalendarUrl(reg)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-stone-300 hover:text-orange-400 block py-1"
                                            >
                                                Google Calendar
                                            </a>
                                            <a
                                                href={getOutlookCalendarUrl(reg)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-stone-300 hover:text-orange-400 block py-1"
                                            >
                                                Outlook Calendar
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {/* Cancel Registration */}
                                {reg.status === 'confirmed' && reg.eventStatus === 'upcoming' && !reg.isTeamEvent && (
                                    <button
                                        onClick={() => setConfirmCancel({ type: 'reg', id: reg._id, name: reg.eventName })}
                                        className="text-red-400 hover:text-red-300 cursor-pointer p-1 transition-colors"
                                        title="Cancel Registration"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}

                                <button
                                    onClick={() => setSelectedTicket(selectedTicket === reg.ticketId ? null : reg.ticketId)}
                                    className="text-orange-400 hover:text-orange-300 text-sm font-medium cursor-pointer underline"
                                >
                                    {reg.ticketId}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            </>
            )}

            {/* Ticket Modal */}
            {selectedTicket && (
                <TicketModal
                    registration={registrations.find(r => r.ticketId === selectedTicket)}
                    onClose={() => setSelectedTicket(null)}
                />
            )}

            {/* Cancel Confirmation Modal */}
            {confirmCancel && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfirmCancel(null)}>
                    <div
                        className="bg-stone-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-center mb-4">
                            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h3 className="text-white text-lg font-semibold">Cancel {confirmCancel.type === 'team' ? 'Team' : ''} Registration?</h3>
                            <p className="text-stone-400 text-sm mt-2">
                                {confirmCancel.type === 'team'
                                    ? `This will cancel team "${confirmCancel.name}" and invalidate all member tickets and QR codes. Members will be notified.`
                                    : `This will cancel your registration for "${confirmCancel.name}". Your ticket and QR code will become invalid.`
                                }
                            </p>
                            <p className="text-red-400 text-xs mt-2 font-medium">This action cannot be undone.</p>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => setConfirmCancel(null)}
                                className="flex-1 py-2.5 text-stone-300 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                            >
                                Keep Registration
                            </button>
                            <button
                                onClick={() => {
                                    handleCancelRegistration(confirmCancel.id, confirmCancel.type === 'team')
                                }}
                                disabled={!!cancellingId}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:opacity-50"
                            >
                                {cancellingId ? 'Cancelling...' : 'Yes, Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function TicketModal({ registration, onClose }) {
    if (!registration) return null

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-stone-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center mb-6">
                    <h2 className="text-white text-2xl font-bold">Event Ticket</h2>
                    <p className="text-stone-400 text-sm mt-1">Keep this for reference</p>
                </div>

                <div className="bg-stone-700 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between">
                        <span className="text-stone-400">Ticket ID</span>
                        <span className="text-orange-400 font-mono font-semibold">{registration.ticketId}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-400">Event</span>
                        <span className="text-white">{registration.eventName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-400">Type</span>
                        <span className="text-white">{registration.eventType}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-400">Organizer</span>
                        <span className="text-white">{registration.organizerName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-400">Date</span>
                        <span className="text-white">{new Date(registration.eventStartDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-stone-400">Status</span>
                        <span className={`font-semibold ${registration.status === 'cancelled' ? 'text-red-400' : 'text-green-400'}`}>{registration.status}</span>
                    </div>
                    {registration.totalAmount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-stone-400">Amount</span>
                            <span className="text-white">₹{registration.totalAmount}</span>
                        </div>
                    )}

                    {/* QR Code */}
                    <div className="flex justify-center mt-4 p-4 bg-white rounded-lg">
                        <div className="text-center">
                            {registration.qrCode && registration.qrCode.startsWith('data:image') ? (
                                <img 
                                    src={registration.qrCode} 
                                    alt="QR Code" 
                                    className="w-48 h-48 border-2 border-stone-300 rounded"
                                />
                            ) : (
                                <div className="w-48 h-48 bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center rounded">
                                    <span className="text-stone-500 text-xs font-mono">QR Code Not Available</span>
                                </div>
                            )}
                            <p className="text-stone-600 text-xs mt-2 font-mono">{registration.ticketId}</p>
                            <p className="text-stone-500 text-xs mt-1">Scan this code at the event</p>
                        </div>
                    </div>
                </div>

                {registration.merchandiseSelections?.length > 0 && (
                    <div className="mt-4 bg-stone-700 rounded-xl p-4">
                        <h4 className="text-white font-semibold mb-2">Items Purchased</h4>
                        {registration.merchandiseSelections.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm text-stone-300 py-1">
                                <span>{item.itemName} ({item.size}/{item.color})</span>
                                <span>×{item.quantity} — ₹{item.price}</span>
                            </div>
                        ))}
                    </div>
                )}

                <Button
                    variant="primary"
                    isbaseStyles={false}
                    className="w-full mt-5 py-2 text-lg"
                    onClick={onClose}
                >
                    Close
                </Button>
            </div>
        </div>
    )
}

export { ParticipantDashboard }
