import axios from 'axios'

const API_BASE = (import.meta.env.VITE_BASE_BACKEND_URL || '') + (import.meta.env.VITE_API_BASE_PATH || '/api')

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
})

// Attach token to every request if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Helper to save token from login/signup responses
export const saveToken = (token) => {
    if (token) {
        localStorage.setItem('authToken', token)
    }
}

export const clearToken = () => {
    localStorage.removeItem('authToken')
}

export default api
