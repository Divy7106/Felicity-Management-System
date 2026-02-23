import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema({
    teamRegistrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration',
        required: true,
        index: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    senderName: {
        type: String,
        required: true,
    },
    messageType: {
        type: String,
        enum: ['text', 'file', 'link', 'system'],
        default: 'text',
    },
    content: {
        type: String,
        required: true,
    },
    fileUrl: {
        type: String,
    },
    fileName: {
        type: String,
    },
}, { timestamps: true })

chatMessageSchema.index({ teamRegistrationId: 1, createdAt: 1 })

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)
export default ChatMessage
