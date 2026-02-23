import axios from 'axios';

const userAPI = axios.create({
    baseURL: '/api',
    withCredentials: true,
})

const getUserData = () => userAPI.get('/user/get-info')

// Organizer password reset
const requestPasswordReset = (currentPassword) =>
    userAPI.post('/user/request-password-reset', { currentPassword })
const getPasswordResetStatus = () => userAPI.get('/user/password-reset-status')

export {
    getUserData,
    requestPasswordReset,
    getPasswordResetStatus,
}