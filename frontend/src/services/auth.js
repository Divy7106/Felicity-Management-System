import qs from 'qs'
import api, { saveToken, clearToken } from './api'

const signupUser = (userData) => api.post('/auth/signup', qs.stringify(userData), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
}).then(res => {
    saveToken(res.data.token)
    return res
})

const loginUser = (userData) => api.post('/auth/login', qs.stringify(userData), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
}).then(res => {
    saveToken(res.data.token)
    return res
})

const logOutUser = () => {
    // Clear token first (don't wait for server)
    clearToken()
    // Then notify server (best effort, ignore errors)
    return api.post('/auth/logout').catch(() => {
        // Ignore logout errors - token is already cleared locally
        return { data: { msgType: "Success", msg: "Logged out locally" } }
    })
}

export {
    signupUser,
    loginUser,
    logOutUser,
}