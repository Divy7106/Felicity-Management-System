import mongoose from 'mongoose'
import { organizer } from '../userSchema/index.js'

const option = {
    discriminatorKey: "eventType",
    timestamps: true,
}

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
    },
    eventdescription: {
        type: String,
    },
    eventType: {
        type: String,
    },
    coverImage: {
        type: String,
    },
    eligibility: {
        type: String,
        default: "Both"
    },
    registrationDeadline: {
        type: Date,
    },
    eventStartDate: {
        type: Date,
    },
    eventEndDate: {
        type: Date,
    },
    registrationLimit: {
        type: Number,
    },
    registrationFee: {
        type: Number,
    },
    organizerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    eventTags: {
        type: [String],
    },

    formFields: [
        {
            fieldId: String,
            label: String,
            fieldType: String,
            options: [String],
            allowedFileFormats: [String],
            placeholder: String,
            isRequired: Boolean,
        }
    ],

    formLocked: {
        type: Boolean,
        default: false,
    },

    isDraft: {
        type: Boolean,
        default: false,
    },

    // Team registration fields (for hackathon-style events)
    allowTeamRegistration: {
        type: Boolean,
        default: false,
    },
    minTeamSize: {
        type: Number,
        default: 2,
    },
    maxTeamSize: {
        type: Number,
        default: 4,
    },
}, option)

// CONSTRAINTS :
eventSchema.pre('save', async function (next) {
    // Skip validation for drafts
    if (this.isDraft) {
    
    } else {


        const nowPlus = new Date(Date.now())

        // Event Name length
        if (!this.eventName || this.eventName.length <= 3 || this.eventName.length > 20) {
            throw new Error("Event Name must be atleast 4 characters and atmost 20 characters long.")
        }

        // Event Description length
        if (!this.eventdescription || this.eventdescription.length < 50 || this.eventdescription.length > 500) {
            throw new Error("Event Description must be atleast 50 characters and atmost 500 characters long.")
        }

        // Event Type (required validation)
        const validEventTypes = ["Normal", "Merchandise"]
        if (!this.eventType) {
            throw new Error("Event Type is required.")
        }
        if (!validEventTypes.includes(this.eventType)) {
            throw new Error("Event Type must be one of: Normal, Merchandise.")
        }

        // Cover Image (required validation)
        if (!this.coverImage) {
            throw new Error("Cover Image is required.")
        }

        // Eligibility (required validation and enum)
        const validEligibility = ["IIITH", "Non-IIITH", "Both"]
        if (!this.eligibility) {
            throw new Error("Eligibility is required.")
        }
        if (!validEligibility.includes(this.eligibility)) {
            throw new Error("Eligibility must be one of: IIIT, Non-IIIT, Both.")
        }

        // Dates validity (required validation)
        if (!this.registrationDeadline) {
            throw new Error("Registration Deadline is required.")
        }
        if (!this.eventStartDate) {
            throw new Error("Event Start Date is required.")
        }
        if (!this.eventEndDate) {
            throw new Error("Event End Date is required.")
        }

        const regDeadline = new Date(this.registrationDeadline)
        const startDate = new Date(this.eventStartDate)
        const endDate = new Date(this.eventEndDate)

        if (isNaN(regDeadline)) {
            throw new Error("Registration Deadline must be a valid date.")
        }
        if (isNaN(startDate)) {
            throw new Error("Event Start Date must be a valid date.")
        }
        if (isNaN(endDate)) {
            throw new Error("Event End Date must be a valid date.")
        }

        // registrationDeadline must be before eventStartDate
        if (regDeadline >= startDate) {
            throw new Error("Registration Deadline must be before Event Start Date.")
        }

        // eventStartDate must be before eventEndDate
        if (startDate >= endDate) {
            throw new Error("Event Start Date must be before Event End Date.")
        }

        if ((regDeadline <= nowPlus) && !this.isEdit) {
            throw new Error("All dates must be in the future.")
        }

        // Event Tags (required validation)
        if (!this.eventTags || !Array.isArray(this.eventTags) || this.eventTags.length < 3 || this.eventTags.length > 25) {
            throw new Error("There must be at least three event tags.")
        }

        // Registration Limit (required validation)
        if (this.registrationLimit === undefined || this.registrationLimit === null) {
            throw new Error("Registration Limit is required.")
        }
        if (typeof this.registrationLimit !== 'number' || this.registrationLimit < 25 || this.registrationLimit > 5000) {
            throw new Error("Registration Limit must be between 25 and 5000.")
        }

        // Registration Fee (required validation)
        if (this.registrationFee === undefined || this.registrationFee === null) {
            throw new Error("Registration Fee is required.")
        }

        if (typeof this.registrationFee !== 'number') {
            throw new Error("Registration Fee must be a number.")
        }

        const organizerData = organizer.findById(this.organizerId)
        if (!organizerData) {
            throw new Error("Organization with given ID do not exist.")
        }
    }
})

const event = mongoose.model('Event', eventSchema)

export default event;