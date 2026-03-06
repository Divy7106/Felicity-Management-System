import api from './api'

const getUserData = () => api.get('/user/get-info')

// Organizer password reset
const requestPasswordReset = (currentPassword) =>
    api.post('/user/request-password-reset', { currentPassword })
const getPasswordResetStatus = () => api.get('/user/password-reset-status')

export {
    getUserData,
    requestPasswordReset,
    getPasswordResetStatus,
}