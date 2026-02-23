import mongoose from 'mongoose'
import crypto from 'crypto'

const registrationSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        unique: true,
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    eventType: {
        type: String,
        enum: ['Normal', 'Merchandise'],
        required: true,
    },
    status: {
        type: String,
        enum: ['confirmed', 'cancelled', 'pending'],
        default: 'confirmed',
    },
    formResponses: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    // For merchandise events
    merchandiseSelections: [{
        itemId: String,
        itemName: String,
        variantId: String,
        size: String,
        color: String,
        quantity: { type: Number, default: 1 },
        price: Number,
    }],
    totalAmount: {
        type: Number,
        default: 0,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'paid',
    },
    attendance: {
        type: Boolean,
        default: false,
    },
    qrCode: {
        type: String,
    },
}, { timestamps: true, discriminatorKey: 'registrationType' })

// Generate unique ticket ID before save
registrationSchema.pre('save', function (next) {
    if (!this.ticketId) {
        const prefix = this.eventType === 'Merchandise' ? 'MERCH' : 'TCKT'
        const timestamp = Date.now().toString(36).toUpperCase()
        const random = crypto.randomBytes(3).toString('hex').toUpperCase()
        this.ticketId = `${prefix}-${timestamp}-${random}`
    }
})

// Compound index to prevent duplicate registrations
registrationSchema.index({ eventId: 1, participantId: 1 }, { unique: true })

const Registration = mongoose.model('Registration', registrationSchema)
export default Registration
