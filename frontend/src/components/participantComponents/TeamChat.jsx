import { useState, useEffect, useRef, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { getTeamChatHistory, uploadChatFile } from '../../services/participant'
import { UserContext } from '../../contexts/UserContexts'

function TeamChat() {
    const { teamRegId } = useParams()
    const navigate = useNavigate()
    const { userData } = useContext(UserContext)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [socket, setSocket] = useState(null)
    const [connected, setConnected] = useState(false)
    const [teamName, setTeamName] = useState('')
    const [teamMembers, setTeamMembers] = useState([])
    const [leaderName, setLeaderName] = useState('')
    const [leaderEmail, setLeaderEmail] = useState('')
    const [leaderId, setLeaderId] = useState('')
    const [onlineUsers, setOnlineUsers] = useState([])
    const [typingUsers, setTypingUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showManagement, setShowManagement] = useState(false)
    const [chatEnabled, setChatEnabled] = useState(true)
    const [chatDisabledReason, setChatDisabledReason] = useState('')
    const [uploading, setUploading] = useState(false)
    const messagesEndRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const fileInputRef = useRef(null)

    const baseUrl = import.meta.env.VITE_BASE_BACKEND_URL || ''

    // Load chat history
    useEffect(() => {
        const loadHistory = async () => {
            try {
                setLoading(true)
                const res = await getTeamChatHistory(teamRegId)
                setMessages(res.data.messages || [])
                setTeamName(res.data.teamName || 'Team Chat')
                setTeamMembers(res.data.teamMembers || [])
                setLeaderName(res.data.leaderName || '')
                setLeaderEmail(res.data.leaderEmail || '')
                setLeaderId(res.data.leaderId || '')
                setChatEnabled(res.data.chatEnabled !== false)
                setChatDisabledReason(res.data.chatDisabledReason || '')
            } catch (err) {
                console.error('Failed to load chat history:', err)
            } finally {
                setLoading(false)
            }
        }
        loadHistory()
    }, [teamRegId])

    // Connect to socket - uses token and cookies for auth
    useEffect(() => {
        const socketUrl = baseUrl || window.location.origin
        const token = localStorage.getItem('authToken')
        const newSocket = io(socketUrl, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            auth: { token },
        })

        newSocket.on('connect', () => {
            setConnected(true)
            newSocket.emit('join-team', teamRegId)
        })

        newSocket.on('disconnect', () => {
            setConnected(false)
        })

        newSocket.on('new-message', (msg) => {
            setMessages(prev => [...prev, msg])
        })

        newSocket.on('online-users', (users) => {
            setOnlineUsers(users)
        })

        newSocket.on('user-typing', ({ userId, userName }) => {
            setTypingUsers(prev => {
                if (prev.find(u => u.userId === userId)) return prev
                return [...prev, { userId, userName }]
            })
        })

        newSocket.on('user-stop-typing', ({ userId }) => {
            setTypingUsers(prev => prev.filter(u => u.userId !== userId))
        })

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message)
        })

        newSocket.on('chat-error', (data) => {
            setChatEnabled(false)
            setChatDisabledReason(data.msg)
        })

        setSocket(newSocket)

        return () => {
            newSocket.emit('leave-team', teamRegId)
            newSocket.disconnect()
        }
    }, [teamRegId, baseUrl])

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = () => {
        if (!newMessage.trim() || !socket || !connected) return

        socket.emit('send-message', {
            teamRegId: teamRegId,
            content: newMessage.trim(),
            messageType: 'text',
        })

        setNewMessage('')
        handleStopTyping()
    }

    const handleTyping = () => {
        if (!socket || !connected) return
        socket.emit('typing', teamRegId)

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            handleStopTyping()
        }, 2000)
    }

    const handleStopTyping = () => {
        if (!socket || !connected) return
        socket.emit('stop-typing', teamRegId)
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            alert('Only PDF files are allowed.')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be under 10MB.')
            return
        }

        try {
            setUploading(true)
            const res = await uploadChatFile(teamRegId, file)
            const { fileUrl, fileName } = res.data

            // Send file message through socket
            socket.emit('send-message', {
                teamRegId,
                content: fileName,
                messageType: 'file',
                fileUrl,
                fileName,
            })
        } catch (err) {
            alert(err.response?.data?.msg || 'File upload failed.')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const formatTime = (dateStr) => {
        const d = new Date(dateStr)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const formatDate = (dateStr) => {
        const d = new Date(dateStr)
        const today = new Date()
        const yesterday = new Date()
        yesterday.setDate(today.getDate() - 1)

        if (d.toDateString() === today.toDateString()) return 'Today'
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
        return d.toLocaleDateString()
    }

    // Group messages by date
    const groupedMessages = messages.reduce((groups, msg) => {
        const date = formatDate(msg.createdAt)
        if (!groups[date]) groups[date] = []
        groups[date].push(msg)
        return groups
    }, {})

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-white text-2xl">Loading chat...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col pb-2 px-3 sm:px-5">
            {/* Header */}
            <div className="bg-stone-800 rounded-xl p-4 mb-3 flex items-center justify-between h-19">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/participant-dashboard')}
                        className="text-orange-400 hover:text-orange-300 cursor-pointer"
                    >
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-white text-lg sm:text-xl font-semibold">{teamName}</h1>
                        <p className="text-stone-400 text-xs">
                            {onlineUsers.length} online · {teamMembers.length + 1} members
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowManagement(!showManagement)}
                        className="text-stone-400 hover:text-orange-400 cursor-pointer text-sm flex items-center gap-1"
                        title="Toggle team panel"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="hidden sm:inline">{showManagement ? 'Hide' : 'Team'}</span>
                    </button>
                    <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                        <span className="text-stone-500 text-xs">{connected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-3 relative" style={{ maxHeight: 'calc(100vh - 170px)', minHeight: 'calc(100vh - 170px)' }}>
                {/* Mobile Sidebar Overlay */}
                {showManagement && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setShowManagement(false)}
                    />
                )}

                {/* Team Management Sidebar (Left) */}
                {showManagement && (
                    <div className={`fixed lg:relative top-0 left-0 h-full lg:h-auto z-50 lg:z-auto flex flex-col w-72 bg-stone-800 rounded-none lg:rounded-xl overflow-hidden shrink-0 transition-transform duration-300`}>
                        <div className="p-4 border-b border-stone-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-white text-sm font-semibold">Team Management</h3>
                                <p className="text-stone-500 text-xs mt-1">{teamName}</p>
                            </div>
                            <button
                                onClick={() => setShowManagement(false)}
                                className="lg:hidden text-stone-400 hover:text-white cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Leader */}
                            <div className="mb-4">
                                <p className="text-stone-500 text-xs uppercase font-medium mb-2">Team Leader</p>
                                <div className="bg-stone-700 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${onlineUsers.includes(leaderId) ? 'bg-green-400' : 'bg-stone-600'}`}></span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-orange-400 text-sm font-medium truncate">{leaderName}</p>
                                            <p className="text-stone-500 text-xs truncate">{leaderEmail}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Members */}
                            <p className="text-stone-500 text-xs uppercase font-medium mb-2">Members ({teamMembers.length})</p>
                            <div className="space-y-2">
                                {teamMembers.map((member, idx) => {
                                    const isOnline = onlineUsers.includes(member.participantId)
                                    return (
                                        <div key={idx} className="bg-stone-700 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-green-400' : 'bg-stone-600'}`}></span>
                                                <p className="text-white text-sm truncate flex-1">{member.firstName || member.name} {member.lastName || ''}</p>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                                                    member.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                                                    member.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                    {member.status}
                                                </span>
                                            </div>
                                            <div className="ml-4 space-y-0.5">
                                                <p className="text-stone-500 text-xs truncate">{member.email}</p>
                                                {member.participantType && (
                                                    <p className="text-stone-500 text-xs">
                                                        <span className={`${member.participantType === 'IIITH' ? 'text-blue-400' : 'text-purple-400'}`}>
                                                            {member.participantType}
                                                        </span>
                                                        {member.organizationName && (
                                                            <span className="text-stone-600"> · {member.organizationName}</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-stone-800 rounded-xl overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-scroll p-4 space-y-1">
                        {Object.entries(groupedMessages).map(([date, msgs]) => (
                            <div key={date}>
                                <div className="flex justify-center my-3">
                                    <span className="text-xs text-stone-300 bg-stone-700 px-3 py-1 rounded-full">{date}</span>
                                </div>
                                {msgs.map((msg, idx) => {
                                    const isMe = msg.senderId === userData?._id
                                    const isSystem = msg.messageType === 'system'

                                    if (isSystem) {
                                        return (
                                            <div key={msg._id || idx} className="flex justify-center my-2">
                                                <span className="text-xs text-stone-500 italic">{msg.content}</span>
                                            </div>
                                        )
                                    }

                                    return (
                                        <div
                                            key={msg._id || idx}
                                            className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[75%] ${isMe ? 'order-last' : ''}`}>
                                                {!isMe && (
                                                    <p className="text-xs text-orange-400 mb-0.5 ml-1">{msg.senderName}</p>
                                                )}
                                                <div className={`px-3 py-2 rounded-2xl ${
                                                    isMe
                                                        ? 'bg-orange-400 text-black rounded-br-md'
                                                        : 'bg-stone-700 text-white rounded-bl-md'
                                                }`}>
                                                    {msg.messageType === 'file' ? (
                                                        <a
                                                            href={`${baseUrl}${msg.fileUrl}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`flex items-center gap-2 ${isMe ? 'text-black' : 'text-orange-400'}`}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="text-sm underline truncate">{msg.fileName || 'PDF File'}</span>
                                                        </a>
                                                    ) : msg.messageType === 'link' ? (
                                                        <a
                                                            href={msg.content}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`underline ${isMe ? 'text-black' : 'text-orange-400'}`}
                                                        >
                                                            {msg.content}
                                                        </a>
                                                    ) : (
                                                        <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                                                    )}
                                                </div>
                                                <p className={`text-[10px] text-stone-500 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                                    {formatTime(msg.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}

                        {messages.length === 0 && (
                            <div className="flex justify-center items-center h-full">
                                <p className="text-stone-500">No messages yet. Start the conversation!</p>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Typing indicator */}
                    {typingUsers.length > 0 && (
                        <div className="px-4 py-1">
                            <p className="text-stone-500 text-xs italic">
                                {typingUsers.map(u => u.userName).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                            </p>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-3 border-t border-stone-700">
                        {!chatEnabled ? (
                            <div className="text-center py-2">
                                <p className="text-stone-500 text-sm">{chatDisabledReason || 'Chat is disabled.'}</p>
                            </div>
                        ) : (
                        <div className="flex gap-2">
                            {/* Hidden file input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!connected || uploading}
                                className="px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-full text-stone-400 hover:text-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title="Upload PDF"
                            >
                                {uploading ? (
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                )}
                            </button>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => {
                                    setNewMessage(e.target.value)
                                    handleTyping()
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2.5 bg-stone-700 border border-stone-600 rounded-full text-white focus:ring-2 focus:ring-orange-400 outline-none text-sm"
                                disabled={!connected}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!newMessage.trim() || !connected}
                                className="px-2 py-2.5 bg-orange-400 text-black rounded-full font-medium hover:bg-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TeamChat
