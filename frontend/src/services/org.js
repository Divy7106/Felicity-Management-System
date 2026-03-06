import axios from 'axios'
import { stringify } from 'qs'

const orgAPI = axios.create({
    baseURL: '/api',
    withCredentials: true,
})

const createOrganizer = (organizerData) => orgAPI.post('/admin/create-org', stringify(organizerData), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
})

// Admin dashboard
const getDashboardStats = () => orgAPI.get('/admin/dashboard-stats')

// Organizer management
const getAdminOrganizers = (search = '') => orgAPI.get('/admin/organizers', { params: { search } })
const deleteOrganizer = (organizerId) => orgAPI.delete(`/admin/delete-organizer/${organizerId}`)

// Password reset management
const getPasswordResetRequests = () => orgAPI.get('/admin/password-reset-requests')
const changeOrganizerPassword = (requestId, newPassword) =>
    orgAPI.put(`/admin/change-organizer-password/${requestId}`, { newPassword })
const rejectPasswordReset = (requestId) =>
    orgAPI.put(`/admin/reject-password-reset/${requestId}`)

export {
    createOrganizer,
    getDashboardStats,
    getAdminOrganizers,
    deleteOrganizer,
    getPasswordResetRequests,
    changeOrganizerPassword,
    rejectPasswordReset,
}