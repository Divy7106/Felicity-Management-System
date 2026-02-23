import mongoose from "mongoose";
import user from "./userSchema.js";

// SCHEMA OF PARTICIPANT :
const participantSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, "First name is required."]
    },
    lastName: {
        type: String,
        required: [true, "Last name is required."]
    },
    participantType: {
        type: String,
        enum: ["IIITH", "Non-IIITH"],
        required: true
    },
    orgName: {
        type: String,
    },
    contactNumber: {
        type: String,
        required: [true, "Contact number is required."]
    },
    followedOrganizers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    interests: [{
        type: String,
    }],
})

// FOR THE VALIDATION OF PARTICIPANT TYPE TO ALWAYS BE IIITH OR Non-IIITH
participantSchema.path("participantType").validate(function (value) {
    if (!value) throw new Error("Participant type is required");
    return ["IIITH", "Non-IIITH"].includes(value);
}, "Invalid participant type");

const participant = user.discriminator("Participant", participantSchema)
export default participant
