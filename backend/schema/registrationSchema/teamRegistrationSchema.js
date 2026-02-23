import mongoose from 'mongoose'
import Registration from './registrationSchema.js'

const teamRegistrationSchema = new mongoose.Schema({
    teamName: {
        type: String,
        required: true,
    },
    teamLeaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    teamSize: {
        type: Number,
        required: true,
    },
    teamMembers: [{
        participantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending',
        },
        joinedAt: {
            type: Date,
        },
    }],
    teamStatus: {
        type: String,
        enum: ['forming', 'complete', 'incomplete'],
        default: 'forming',
    },
})

// Override the compound index — for team registrations the uniqueness
// is per team, not per participant (leader registers the team).
// Individual members get their own normal registrations when they accept.

const TeamRegistration = Registration.discriminator('Team', teamRegistrationSchema)
export default TeamRegistration
