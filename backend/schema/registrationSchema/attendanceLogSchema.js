import mongoose from 'mongoose'

const attendanceLogSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true,
    },
    registrationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration',
        required: true,
    },
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    ticketId: {
        type: String,
        required: true,
    },
    action: {
        type: String,
        enum: ['scan', 'manual-mark', 'manual-unmark'],
        required: true,
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    reason: {
        type: String,
        default: '',
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    scanMethod: {
        type: String,
        enum: ['qr-camera', 'qr-file', 'manual'],
        default: 'manual',
    },
}, { timestamps: true })

attendanceLogSchema.index({ eventId: 1, registrationId: 1 })

const AttendanceLog = mongoose.model('AttendanceLog', attendanceLogSchema)
export default AttendanceLog
