import mongoose from 'mongoose'

const passwordResetSchema = new mongoose.Schema({
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    organizerName: {
        type: String,
        required: true,
    },
    organizerEmail: {
        type: String,
        required: true,
    },
    contactEmail: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'rejected'],
        default: 'pending',
    },
    completedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true })

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema)
export default PasswordReset
