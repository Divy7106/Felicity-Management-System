import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getOrgEventParticipants } from '../../services/participant'
import Button from '../Button'
import QRScanner from './QRScanner'

function OrganizerEventDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const isOngoingRoute = location.pathname.startsWith('/ongoing-events')
    const [event, setEvent] = useState(null)
    const [analytics, setAnalytics] = useState(null)
    const [participants, setParticipants] = useState([])
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [initialLoad, setInitialLoad] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('All')
    const [filterAttendance, setFilterAttendance] = useState('All')
    const [filterRegDate, setFilterRegDate] = useState('')
    const [teamSearchTerm, setTeamSearchTerm] = useState('')
    const [selectedTeam, setSelectedTeam] = useState(null)
    const [message, setMessage] = useState({ text: '', type: '' })
    const [ticketInput, setTicketInput] = useState('')
    const [doScan, setDoScan] = useState(false)

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = useCallback(async () => {
        try {
            const res = await getOrgEventParticipants(id)
            setEvent(res.data.response.event)
            setAnalytics(res.data.response.analytics)
            setParticipants(res.data.response.participants || [])
            setTeams(res.data.response.teams || [])
        } catch (err) {
            console.error('Failed to fetch event detail:', err)
        } finally {
            setLoading(false)
            setInitialLoad(false)
        }
    }, [id])

    const exportCSV = () => {
        const headers = ['Name', 'Email', 'Ticket ID', 'Registration Date', 'Payment', 'Amount', 'Attendance', 'Status']
        const rows = filteredParticipants.map(p => [
            p.participantName,
            p.participantEmail,
            p.ticketId,
            new Date(p.registrationDate).toLocaleDateString(),
            p.paymentStatus,
            p.totalAmount,
            p.attendance ? 'Yes' : 'No',
            p.status,
        ])

        const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${event?.eventName || 'event'}_participants.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const filteredParticipants = participants.filter(p => {
        const matchesSearch = !searchTerm ||
            p.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.participantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.ticketId.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesFilter = filterStatus === 'All' || p.status === filterStatus

        const matchesAttendance = filterAttendance === 'All' ||
            (filterAttendance === 'present' && p.attendance) ||
            (filterAttendance === 'absent' && !p.attendance)

        const matchesRegDate = !filterRegDate ||
            new Date(p.registrationDate).toLocaleDateString() === new Date(filterRegDate).toLocaleDateString()

        return matchesSearch && matchesFilter && matchesAttendance && matchesRegDate
    })

    if (initialLoad) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-white text-2xl">Loading event...</p>
            </div>
        )
    }

    if (!event) {
        return (
            <div className="flex flex-col justify-center items-center h-screen gap-4">
                <p className="text-red-400 text-2xl">Event not found.</p>
                <Button variant="primary" isbaseStyles={false} className="px-6 py-2" onClick={() => navigate(isOngoingRoute ? '/ongoing-events' : '/organizer-dashboard')}>
                    Back to {isOngoingRoute ? 'On Going Events' : 'Dashboard'}
                </Button>
            </div>
        )
    }

    const statusColors = {
        draft: 'text-yellow-400 bg-yellow-400/10',
        published: 'text-blue-400 bg-blue-400/10',
        onGoing: 'text-green-400 bg-green-400/10',
        closed: 'text-red-400 bg-red-400/10',
    }

    

    return (
        <div className="pb-10 px-3 sm:px-5">
            <button
                onClick={() => navigate(isOngoingRoute ? '/ongoing-events' : '/organizer-dashboard')}
                className="text-orange-400 hover:text-orange-300 mb-3 flex items-center gap-1 cursor-pointer"
            >
                ← Back to {isOngoingRoute ? 'On Going Events' : 'Dashboard'}
            </button>

            {message.text && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Event Overview */}
            <div className='flex flex-col lg:flex-row w-full'>


                <div className='bg-stone-800 rounded-xl mb-6 lg:mr-4'>
                    {event.coverImage &&
                            <img
                                src={import.meta.env.VITE_BASE_BACKEND_URL + event.coverImage}
                                alt="Preview"
                                className="rounded-lg w-full lg:w-[300px] h-auto lg:h-[210px] object-cover"

                            />
                        }
                </div>

                <div className="bg-stone-800 rounded-xl p-4 sm:p-6 mb-6 w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                <h1 className="text-white text-2xl sm:text-3xl font-bold">{event.eventName}</h1>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[event.status] || 'text-stone-400'}`}>
                                    {event.status}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white ${event.eventType === 'Normal' ? 'bg-blue-500' : 'bg-purple-500'
                                    }`}>
                                    {event.eventType}
                                </span>
                            </div>
                            <p className="text-stone-400 text-sm mt-1">{event.eventDescription}</p>
                        </div>
                    </div>


                    {/* Event Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-5">
                        <div className="bg-stone-700 rounded-lg p-3">
                            <p className="text-stone-400 text-xs">Registration Due</p>
                            <p className="text-white text-sm font-medium">{new Date(event.registrationDeadline).toLocaleString()}</p>
                        </div>
                        <div className="bg-stone-700 rounded-lg p-3">
                            <p className="text-stone-400 text-xs">Start</p>
                            <p className="text-white text-sm font-medium">{new Date(event.eventStartDate).toLocaleString()}</p>
                        </div>
                        <div className="bg-stone-700 rounded-lg p-3">
                            <p className="text-stone-400 text-xs">End</p>
                            <p className="text-white text-sm font-medium">{new Date(event.eventEndDate).toLocaleString()}</p>
                        </div>
                        <div className="bg-stone-700 rounded-lg p-3">
                            <p className="text-stone-400 text-xs">Eligibility</p>
                            <p className="text-white text-sm font-medium">{event.eligibility}</p>
                        </div>
                        <div className="bg-stone-700 rounded-lg p-3">
                            <p className="text-stone-400 text-xs">Fee</p>
                            <p className="text-white text-sm font-medium">₹{event.registrationFee || 0}</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Analytics */}
            {analytics && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-stone-800 rounded-xl p-6 text-center">
                        <p className="text-3xl font-bold text-orange-400">{analytics.totalRegistrations}</p>
                        <p className="text-stone-400 text-sm mt-1">Total Registrations</p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-6 text-center">
                        <p className="text-3xl font-bold text-green-400">₹{analytics.totalRevenue}</p>
                        <p className="text-stone-400 text-sm mt-1">Total Revenue</p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-6 text-center">
                        <p className="text-3xl font-bold text-blue-400">{analytics.totalAttendance}</p>
                        <p className="text-stone-400 text-sm mt-1">Attendance</p>
                    </div>
                    {event.allowTeamRegistration && (
                        <div className="bg-stone-800 rounded-xl p-6 text-center">
                            <p className="text-3xl font-bold text-purple-400">{analytics.totalTeams || 0}</p>
                            <p className="text-stone-400 text-sm mt-1">Total Teams</p>
                        </div>
                    )}
                </div>
            )}

            {/* Team Registration Info */}
            {event.allowTeamRegistration && (
                <div className="bg-stone-800 rounded-xl p-4 sm:p-6 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-white text-xl sm:text-2xl font-semibold">Team Registration Settings</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Enabled</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                        <div className="bg-stone-700 rounded-lg p-3">
                            <p className="text-stone-400 text-xs">Min Team Size</p>
                            <p className="text-white text-sm font-medium">{event.minTeamSize || 2}</p>
                        </div>
                        <div className="bg-stone-700 rounded-lg p-3">
                            <p className="text-stone-400 text-xs">Max Team Size</p>
                            <p className="text-white text-sm font-medium">{event.maxTeamSize || 4}</p>
                        </div>
                        <div className="bg-stone-700 rounded-lg p-3">
                            <p className="text-stone-400 text-xs">Total Teams</p>
                            <p className="text-white text-sm font-medium">{teams.length}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Teams List */}
            {event.allowTeamRegistration && teams.length > 0 && (
                <div className="bg-stone-800 rounded-xl p-4 sm:p-6 mb-6">
                    <h2 className="text-white text-xl sm:text-2xl font-semibold mb-4">Teams ({teams.length})</h2>

                    <div className="mb-4">
                        <input
                            type="text"
                            value={teamSearchTerm}
                            onChange={(e) => { setTeamSearchTerm(e.target.value); setSelectedTeam(null) }}
                            placeholder="Search by team name, leader, or member..."
                            className="w-full px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-400 focus:ring-2 focus:ring-orange-400 outline-none"
                        />
                    </div>

                    <div className="space-y-3">
                        {teams
                            .filter(t => {
                                if (!teamSearchTerm) return true
                                const term = teamSearchTerm.toLowerCase()
                                return t.teamName.toLowerCase().includes(term) ||
                                    t.leaderName.toLowerCase().includes(term) ||
                                    t.leaderEmail.toLowerCase().includes(term) ||
                                    t.teamMembers.some(m =>
                                        m.name.toLowerCase().includes(term) ||
                                        m.email.toLowerCase().includes(term)
                                    )
                            })
                            .map(team => (
                                <div key={team._id} className="bg-stone-700 rounded-lg p-4">
                                    <div
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                                        onClick={() => setSelectedTeam(selectedTeam === team._id ? null : team._id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-semibold">{team.teamName}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                team.teamStatus === 'complete' ? 'bg-green-500/20 text-green-400' :
                                                team.teamStatus === 'incomplete' ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                                {team.teamStatus}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-stone-400 text-sm">
                                            <span>Leader: <span className="text-white">{team.leaderName}</span></span>
                                            <span>Size: <span className="text-white">{team.teamSize}</span></span>
                                            {team.ticketId && <span className="text-orange-400 font-mono text-xs">{team.ticketId}</span>}
                                            <span className="text-orange-400">{selectedTeam === team._id ? '▲' : '▼'}</span>
                                        </div>
                                    </div>

                                    {selectedTeam === team._id && (
                                        <div className="mt-3 border-t border-stone-600 pt-3">
                                            <p className="text-stone-400 text-xs mb-2 uppercase font-medium">Team Members</p>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead>
                                                        <tr className="border-b border-stone-600">
                                                            <th className="text-stone-400 text-xs font-medium pb-2">Name</th>
                                                            <th className="text-stone-400 text-xs font-medium pb-2">Email</th>
                                                            <th className="text-stone-400 text-xs font-medium pb-2">Status</th>
                                                            <th className="text-stone-400 text-xs font-medium pb-2">Type</th>
                                                            <th className="text-stone-400 text-xs font-medium pb-2">Organization</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr className="border-b border-stone-600/50">
                                                            <td className="py-2 text-orange-400">{team.leaderName} (Leader)</td>
                                                            <td className="py-2 text-stone-300">{team.leaderEmail}</td>
                                                            <td className="py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">leader</span></td>
                                                            <td className="py-2 text-stone-300">{team.leaderParticipantType ? team.leaderParticipantType : '	—'}</td>
                                                            <td className="py-2 text-stone-300">{team.leaderOrganizerName ? team.leaderOrganizerName : '	—'}</td>
                                                        </tr>
                                                        {team.teamMembers.map((m, idx) => (
                                                            <tr key={idx} className="border-b border-stone-600/50">
                                                                <td className="py-2 text-white">{m.firstName || m.name} {m.lastName || ''}</td>
                                                                <td className="py-2 text-stone-300">{m.email}</td>
                                                                <td className="py-2">
                                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                        m.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                                                        m.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                                                        'bg-yellow-500/20 text-yellow-400'
                                                                    }`}>
                                                                        {m.status}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2 text-stone-300">{m.participantType || '—'}</td>
                                                                <td className="py-2 text-stone-300">{m.organizationName || '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {/* QR Scanner & Attendance - only for ongoing events */}
            {event && (event.status === 'onGoing' || isOngoingRoute) && (
                <QRScanner eventId={id} eventName={event.eventName} onAttendanceChange={fetchData} ticketInput={ticketInput} setTicketInput={setTicketInput} doScan={doScan} setDoScan={setDoScan} />
            )}

            {/* Participants List */}
            <div className="bg-stone-800 rounded-xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                    <h2 className="text-white text-xl sm:text-2xl font-semibold">Participants ({filteredParticipants.length})</h2>
                    <Button variant="primary" isbaseStyles={false} className="px-4 py-2 text-sm" onClick={exportCSV}>
                        Export CSV
                    </Button>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, email, or ticket..."
                        className="flex-1 px-4 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-400 focus:ring-2 focus:ring-orange-400 outline-none"
                    />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-stone-700 text-white px-3 py-2 rounded-lg border border-stone-600 cursor-pointer"
                    >
                        <option value="All">All Status</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <select
                        value={filterAttendance}
                        onChange={(e) => setFilterAttendance(e.target.value)}
                        className="bg-stone-700 text-white px-3 py-2 rounded-lg border border-stone-600 cursor-pointer"
                    >
                        <option value="All">All Attendance</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                    </select>
                    <input
                        type="date"
                        value={filterRegDate}
                        onChange={(e) => setFilterRegDate(e.target.value)}
                        className="bg-stone-700 text-white px-3 py-2 rounded-lg border border-stone-600"
                        title="Filter by registration date"
                    />
                </div>

                {/* Table */}
                {filteredParticipants.length === 0 ? (
                    <p className="text-stone-400 text-center py-8">No participants found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-stone-700">
                                    <th className="text-stone-400 text-xs font-medium pb-3 uppercase">Name</th>
                                    <th className="text-stone-400 text-xs font-medium pb-3 uppercase">Email</th>
                                    <th className="text-stone-400 text-xs font-medium pb-3 uppercase">Ticket ID</th>
                                    <th className="text-stone-400 text-xs font-medium pb-3 uppercase">Reg Date</th>
                                    <th className="text-stone-400 text-xs font-medium pb-3 uppercase">Payment</th>
                                    <th className="text-stone-400 text-xs font-medium pb-3 uppercase">Amount</th>
                                    <th className="text-stone-400 text-xs font-medium pb-3 uppercase">Attendance</th>
                                    <th className="text-stone-400 text-xs font-medium pb-3 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredParticipants.map(p => (
                                    <tr key={p._id} className="border-b border-stone-700/50 hover:bg-stone-700/30">
                                        <td className="py-3 text-white text-sm">{p.participantName}</td>
                                        <td className="py-3 text-stone-400 text-sm">{p.participantEmail}</td>
                                        <td className="py-3 text-orange-400 text-sm font-mono">
                                            {p.ticketId}
                                            <button className='text-gray-300 bg-stone-700 px-2 mx-1 rounded-xl hover:bg-stone-600' onClick={() => {setTicketInput(p.ticketId); setDoScan(true)}}>mark</button>
                                        </td>
                                        <td className="py-3 text-stone-400 text-sm">{new Date(p.registrationDate).toLocaleDateString()}</td>
                                        <td className="py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.paymentStatus === 'paid'
                                                ? 'bg-green-500/20 text-green-400'
                                                : p.paymentStatus === 'refunded'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {p.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="py-3 text-white text-sm">₹{p.totalAmount}</td>
                                        <td className="py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.attendance
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-stone-600/50 text-stone-400'
                                                }`}>
                                                {p.attendance ? 'Present' : 'Absent'}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                                p.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default OrganizerEventDetail
