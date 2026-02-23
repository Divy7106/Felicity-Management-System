import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import ChatMessage from './schema/chatSchema/chatMessageSchema.js'
import { TeamRegistration } from './schema/registrationSchema/index.js'
import user from './schema/userSchema/userSchema.js'
import normalEvent from './schema/eventSchema/normalEvent.js'
import merchandiseEvent from './schema/eventSchema/merchandiseEventSchema.js'

// ENV CONFIG :
dotenv.config()

// GETTING ROUTERS :
import { userAuthRouter } from './routers/index.js'
import { userRouter } from './routers/index.js'
import { adminRouter } from './routers/index.js'
import { organizerRouter } from './routers/index.js'
import { participantRouter } from './routers/index.js'

// GETTING MIDDLEWARES :
import {isLoggedIn} from './middlewares/index.js'

// ENV VARIABLES :
const PORT = process.env.PORT || 5000
const MONGO_URL = process.env.MONGO_URL

const app = express()
const httpServer = createServer(app)

// Socket.IO setup
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    }
})

await mongoose.connect(MONGO_URL)
    .then(() => console.log("DATABASE CONNECTED SUCCESSFULLY"))
    .catch((err) => {console.log("DATABASE CONNECTION FAILED", err)})

// MIDDLEWARES :
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use('/uploads', express.static('uploads'))

app.use('/api/auth', userAuthRouter)

// AUTH LAYER :
app.use(isLoggedIn)
app.use('/api/admin', adminRouter)
app.use('/api/organizer', organizerRouter)
app.use('/api/user', userRouter)
app.use('/api/participant', participantRouter)

// ─── SOCKET.IO AUTH & CHAT ──────────────────────────────────────────
const onlineUsers = new Map() // teamRegId -> Set of { socketId, userId, userName }
const typingUsers = new Map() // teamRegId -> Set of userId

io.use(async (socket, next) => {
    // Support both auth token and cookie-based auth
    let token = socket.handshake.auth?.token
    if (!token) {
        // Try to read from cookies
        const cookieHeader = socket.handshake.headers?.cookie
        if (cookieHeader) {
            const cookies = cookieHeader.split(';').reduce((acc, c) => {
                const [key, val] = c.trim().split('=')
                acc[key] = val
                return acc
            }, {})
            token = cookies.sessionId
        }
    }
    if (!token) return next(new Error('Authentication required'))
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY)
        const userData = await user.findById(decoded.userId)
        if (!userData) return next(new Error('User not found'))
        socket.userData = {
            _id: userData._id.toString(),
            email: userData.email,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
        }
        next()
    } catch (err) {
        next(new Error('Invalid token'))
    }
})

io.on('connection', (socket) => {
    const userId = socket.userData._id
    const userName = socket.userData.firstName
        ? `${socket.userData.firstName} ${socket.userData.lastName || ''}`
        : socket.userData.email

    // Join a team chat room
    socket.on('join-team', async (teamRegId) => {
        try {
            // Verify user is a member of this team
            const teamReg = await TeamRegistration.findById(teamRegId)
            if (!teamReg) return

            const isMember = teamReg.teamLeaderId.toString() === userId ||
                teamReg.teamMembers.some(m =>
                    m.participantId.toString() === userId && m.status === 'accepted'
                )
            if (!isMember) return

            socket.join(teamRegId)
            socket.teamRegId = teamRegId

            // Track online users
            if (!onlineUsers.has(teamRegId)) onlineUsers.set(teamRegId, new Set())
            onlineUsers.get(teamRegId).add(userId)

            // Notify room about online status
            io.to(teamRegId).emit('online-users', Array.from(onlineUsers.get(teamRegId)))
        } catch (err) {
            console.error('join-team error:', err)
        }
    })

    // Send message
    socket.on('send-message', async (data) => {
        try {
            const { teamRegId, content, messageType, fileUrl, fileName } = data

            // Verify team exists and chat is enabled
            const teamReg = await TeamRegistration.findById(teamRegId)
            if (!teamReg) return

            // Check if team registration is cancelled
            if (teamReg.status === 'cancelled') {
                socket.emit('chat-error', { msg: 'This team registration has been cancelled. Chat is disabled.' })
                return
            }

            // Check all members accepted
            const allAccepted = teamReg.teamMembers.every(m => m.status === 'accepted')
            if (!allAccepted) {
                socket.emit('chat-error', { msg: 'Chat is available only after all team members have accepted.' })
                return
            }

            // Check event not ended
            const event = await normalEvent.findById(teamReg.eventId) || await merchandiseEvent.findById(teamReg.eventId)
            if (event && new Date() > new Date(event.eventEndDate)) {
                socket.emit('chat-error', { msg: 'This event has ended. Chat is now read-only.' })
                return
            }

            const message = new ChatMessage({
                teamRegistrationId: teamRegId,
                senderId: userId,
                senderName: userName,
                messageType: messageType || 'text',
                content,
                fileUrl,
                fileName,
            })
            await message.save()

            io.to(teamRegId).emit('new-message', {
                _id: message._id,
                senderId: userId,
                senderName: userName,
                content,
                messageType: message.messageType,
                fileUrl,
                fileName,
                createdAt: message.createdAt,
            })
        } catch (err) {
            console.error('send-message error:', err)
        }
    })

    // Typing indicator
    socket.on('typing', (teamRegId) => {
        socket.to(teamRegId).emit('user-typing', { userId, userName })
    })

    socket.on('stop-typing', (teamRegId) => {
        socket.to(teamRegId).emit('user-stop-typing', { userId })
    })

    // Leave team room
    socket.on('leave-team', (teamRegId) => {
        socket.leave(teamRegId)
        if (onlineUsers.has(teamRegId)) {
            onlineUsers.get(teamRegId).delete(userId)
            io.to(teamRegId).emit('online-users', Array.from(onlineUsers.get(teamRegId)))
        }
    })

    // Disconnect
    socket.on('disconnect', () => {
        if (socket.teamRegId && onlineUsers.has(socket.teamRegId)) {
            onlineUsers.get(socket.teamRegId).delete(userId)
            io.to(socket.teamRegId).emit('online-users', Array.from(onlineUsers.get(socket.teamRegId)))
        }
    })
})

httpServer.listen(PORT, () => {console.log(`SERVER STARTED : ${PORT}`)})