import axios from 'axios'

const participantAPI = axios.create({
    baseURL: '/api',
    withCredentials: true,
})

// Dashboard - My registrations
const getMyRegistrations = () => participantAPI.get('/participant/my-registrations')

// Browse events
const browseEvents = (params = {}) => participantAPI.get('/participant/browse-events', { params })

// Trending events
const getTrendingEvents = () => participantAPI.get('/participant/trending-events')

// Event details
const getEventDetails = (eventId) => participantAPI.get(`/participant/event/${eventId}`)

// Register for normal event
const registerForEvent = (eventId, formResponses = {}) =>
    participantAPI.post(`/participant/register/${eventId}`, { formResponses })

// Purchase merchandise
const purchaseMerchandise = (eventId, selections) =>
    participantAPI.post(`/participant/purchase/${eventId}`, { selections })

// Get ticket details
const getTicketDetails = (ticketId) => participantAPI.get(`/participant/ticket/${ticketId}`)

// Get all organizers
const getAllOrganizers = () => participantAPI.get('/participant/organizers')

// Follow/unfollow organizer
const toggleFollowOrganizer = (organizerId) =>
    participantAPI.post(`/participant/toggle-follow/${organizerId}`)

// Get organizer detail
const getOrganizerDetail = (organizerId) => participantAPI.get(`/participant/organizer/${organizerId}`)

// Profile
const editProfile = (data) => participantAPI.put('/user/edit-profile', data)
const changePassword = (data) => participantAPI.put('/user/change-password', data)

// Team registration
const createTeam = (eventId, data) =>
    participantAPI.post(`/participant/team/create/${eventId}`, data)

const getTeamInvites = () => participantAPI.get('/participant/team/invites')

const respondToInvite = (teamRegId, action) =>
    participantAPI.post(`/participant/team/respond/${teamRegId}`, { action })

const getMyTeams = () => participantAPI.get('/participant/team/my-teams')

const getTeamChatHistory = (teamRegId) =>
    participantAPI.get(`/participant/team/chat/${teamRegId}`)

const getTeamUnreadCounts = (lastRead = {}) =>
    participantAPI.get('/participant/team/unread-counts', { params: { lastRead: JSON.stringify(lastRead) } })

const uploadChatFile = (teamRegId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return participantAPI.post(`/participant/team/chat/upload/${teamRegId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}

// Calendar
const exportCalendar = (eventId) =>
    participantAPI.get(`/participant/calendar/export/${eventId}`, { responseType: 'blob' })

// Onboarding
const submitOnboarding = (data) =>
    participantAPI.post('/participant/onboarding', data)
const getTopOrganizers = () =>
    participantAPI.get('/participant/top-organizers')

const exportCalendarBatch = (eventIds) =>
    participantAPI.post('/participant/calendar/export-batch', { eventIds }, { responseType: 'blob' })

const getGoogleCalendarUrl = (event) => {
    const start = new Date(event.eventStartDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const end = new Date(event.eventEndDate).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.eventName,
        dates: `${start}/${end}`,
        details: event.eventdescription || event.description || '',
    })
    return `https://www.google.com/calendar/render?${params.toString()}`
}

const getOutlookCalendarUrl = (event) => {
    const start = new Date(event.eventStartDate).toISOString()
    const end = new Date(event.eventEndDate).toISOString()
    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        startdt: start,
        enddt: end,
        subject: event.eventName,
        body: event.eventdescription || event.description || '',
    })
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

// Cancel registration
const cancelRegistration = (registrationId) =>
    participantAPI.put(`/participant/cancel-registration/${registrationId}`)

// Cancel team registration (leader only) — uses the same unified endpoint
const cancelTeamRegistration = (teamRegId) =>
    participantAPI.put(`/participant/cancel-registration/${teamRegId}`)

// Organizer analytics
const getOrgEventAnalytics = () => participantAPI.get('/organizer/event-analytics')
const getOrgEventParticipants = (eventId) => participantAPI.get(`/organizer/event-participants/${eventId}`)
const closeEvent = (eventId) => participantAPI.put(`/organizer/close-event/${eventId}`)
const markAttendance = (registrationId) => participantAPI.put(`/organizer/mark-attendance/${registrationId}`)

// QR Scanning / Attendance
const scanQR = (eventId, ticketId, scanMethod) =>
    participantAPI.post(`/organizer/scan-qr/${eventId}`, { ticketId, scanMethod })
const manualAttendance = (registrationId, action, reason) =>
    participantAPI.put(`/organizer/manual-attendance/${registrationId}`, { action, reason })
const getAttendanceDashboard = (eventId) =>
    participantAPI.get(`/organizer/attendance-dashboard/${eventId}`)
const getAttendanceCSV = (eventId) =>
    participantAPI.get(`/organizer/attendance-csv/${eventId}`, { responseType: 'blob' })
const getAttendanceLog = (eventId) =>
    participantAPI.get(`/organizer/attendance-log/${eventId}`)

export {
    getMyRegistrations,
    browseEvents,
    getTrendingEvents,
    getEventDetails,
    registerForEvent,
    purchaseMerchandise,
    getTicketDetails,
    getAllOrganizers,
    toggleFollowOrganizer,
    getOrganizerDetail,
    editProfile,
    changePassword,
    cancelRegistration,
    cancelTeamRegistration,
    getOrgEventAnalytics,
    getOrgEventParticipants,
    closeEvent,
    markAttendance,
    scanQR,
    manualAttendance,
    getAttendanceDashboard,
    getAttendanceCSV,
    getAttendanceLog,
    createTeam,
    getTeamInvites,
    respondToInvite,
    getMyTeams,
    getTeamChatHistory,
    getTeamUnreadCounts,
    uploadChatFile,
    exportCalendar,
    exportCalendarBatch,
    getGoogleCalendarUrl,
    getOutlookCalendarUrl,
    submitOnboarding,
    getTopOrganizers,
}
