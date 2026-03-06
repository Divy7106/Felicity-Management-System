import { stringify } from 'qs'
import api from './api'

const createOrganizer = (organizerData) => api.post('/admin/create-org', stringify(organizerData), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
})

// Admin dashboard
const getDashboardStats = () => api.get('/admin/dashboard-stats')

// Organizer management
const getAdminOrganizers = (search = '') => api.get('/admin/organizers', { params: { search } })
const deleteOrganizer = (organizerId) => api.delete(`/admin/delete-organizer/${organizerId}`)

// Password reset management
const getPasswordResetRequests = () => api.get('/admin/password-reset-requests')
const changeOrganizerPassword = (requestId, newPassword) =>
    api.put(`/admin/change-organizer-password/${requestId}`, { newPassword })
const rejectPasswordReset = (requestId) =>
    api.put(`/admin/reject-password-reset/${requestId}`)

export {
    createOrganizer,
    getDashboardStats,
    getAdminOrganizers,
    deleteOrganizer,
    getPasswordResetRequests,
    changeOrganizerPassword,
    rejectPasswordReset,
}