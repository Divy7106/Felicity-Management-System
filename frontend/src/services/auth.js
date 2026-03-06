import axios from 'axios'
import qs from 'qs'

const authAPI = axios.create({
    baseURL: '/api',
    withCredentials: true,
})

const signupUser = (userData) => authAPI.post('/auth/signup', qs.stringify(userData), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
})

const loginUser = (userData) => authAPI.post('/auth/login', qs.stringify(userData), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
})

const logOutUser = () => authAPI.post('/auth/logout')

export {
    signupUser,
    loginUser,
    logOutUser,
}