import api from './api'

// Dashboard - My registrations
const getMyRegistrations = () => api.get('/participant/my-registrations')

// Browse events
const browseEvents = (params = {}) => api.get('/participant/browse-events', { params })

// Trending events
const getTrendingEvents = () => api.get('/participant/trending-events')

// Event details
const getEventDetails = (eventId) => api.get(`/participant/event/${eventId}`)

// Register for normal event
const registerForEvent = (eventId, formResponses = {}, fileUploads = {}) => {
    const hasFiles = Object.keys(fileUploads).length > 0
    if (hasFiles) {
        const formData = new FormData()
        formData.append('formResponses', JSON.stringify(formResponses))
        for (const [fieldId, file] of Object.entries(fileUploads)) {
            formData.append(`file_${fieldId}`, file)
        }
        return api.post(`/participant/register/${eventId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    }
    return api.post(`/participant/register/${eventId}`, { formResponses })
}

// Purchase merchandise
const purchaseMerchandise = (eventId, selections) =>
    api.post(`/participant/purchase/${eventId}`, { selections })

// Get ticket details
const getTicketDetails = (ticketId) => api.get(`/participant/ticket/${ticketId}`)

// Get all organizers
const getAllOrganizers = () => api.get('/participant/organizers')

// Follow/unfollow organizer
const toggleFollowOrganizer = (organizerId) =>
    api.post(`/participant/toggle-follow/${organizerId}`)

// Get organizer detail
const getOrganizerDetail = (organizerId) => api.get(`/participant/organizer/${organizerId}`)

// Profile
const editProfile = (data) => api.put('/user/edit-profile', data)
const changePassword = (data) => api.put('/user/change-password', data)

// Team registration
const createTeam = (eventId, data, fileUploads = {}) => {
    const hasFiles = Object.keys(fileUploads).length > 0
    if (hasFiles) {
        const formData = new FormData()
        formData.append('teamName', data.teamName)
        formData.append('memberEmails', JSON.stringify(data.memberEmails))
        formData.append('formResponses', JSON.stringify(data.formResponses || {}))
        for (const [fieldId, file] of Object.entries(fileUploads)) {
            formData.append(`file_${fieldId}`, file)
        }
        return api.post(`/participant/team/create/${eventId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    }
    return api.post(`/participant/team/create/${eventId}`, data)
}

const getTeamInvites = () => api.get('/participant/team/invites')

const respondToInvite = (teamRegId, action) =>
    api.post(`/participant/team/respond/${teamRegId}`, { action })

const getMyTeams = () => api.get('/participant/team/my-teams')

const getTeamChatHistory = (teamRegId) =>
    api.get(`/participant/team/chat/${teamRegId}`)

const getTeamUnreadCounts = (lastRead = {}) =>
    api.get('/participant/team/unread-counts', { params: { lastRead: JSON.stringify(lastRead) } })

const uploadChatFile = (teamRegId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/participant/team/chat/upload/${teamRegId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}

// Calendar
const exportCalendar = (eventId) =>
    api.get(`/participant/calendar/export/${eventId}`, { responseType: 'blob' })

// Onboarding
const submitOnboarding = (data) =>
    api.post('/participant/onboarding', data)
const getTopOrganizers = () =>
    api.get('/participant/top-organizers')

const exportCalendarBatch = (eventIds) =>
    api.post('/participant/calendar/export-batch', { eventIds }, { responseType: 'blob' })

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
    const start = new Date(event.eventStartDate)
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z')

    const end = new Date(event.eventEndDate)
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z')

    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        startdt: start,
        enddt: end,
        subject: event.eventName,
        body: event.eventdescription || event.description || '',
        location: event.location || ''
    })

    return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`
}

// Cancel registration
const cancelRegistration = (registrationId) =>
    api.put(`/participant/cancel-registration/${registrationId}`)

// Cancel team registration (leader only) — uses the same unified endpoint
const cancelTeamRegistration = (teamRegId) =>
    api.put(`/participant/cancel-registration/${teamRegId}`)

// Organizer analytics
const getOrgEventAnalytics = () => api.get('/organizer/event-analytics')
const getOrgEventParticipants = (eventId) => api.get(`/organizer/event-participants/${eventId}`)
const closeEvent = (eventId) => api.put(`/organizer/close-event/${eventId}`)
const markAttendance = (registrationId) => api.put(`/organizer/mark-attendance/${registrationId}`)

// QR Scanning / Attendance
const scanQR = (eventId, ticketId, scanMethod) =>
    api.post(`/organizer/scan-qr/${eventId}`, { ticketId, scanMethod })
const manualAttendance = (registrationId, action, reason) =>
    api.put(`/organizer/manual-attendance/${registrationId}`, { action, reason })
const getAttendanceDashboard = (eventId) =>
    api.get(`/organizer/attendance-dashboard/${eventId}`)
const getAttendanceCSV = (eventId) =>
    api.get(`/organizer/attendance-csv/${eventId}`, { responseType: 'blob' })
const getAttendanceLog = (eventId) =>
    api.get(`/organizer/attendance-log/${eventId}`)

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
