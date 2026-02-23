import mongoose from "mongoose";
import user from "./userSchema.js";

// ORGANIZER SCHEMA :
const organizerSchema = new mongoose.Schema({
    organizerName: {
        type: String,
        required: [true, "Organizer name is required"],
        unique: true,
    },
    description: {
        type: String
    },
    category: {
        type: String,
        enum: ["Technical", "Cultural", "Sports",
            "Literary", "Design", "Management",
            "Social/Community", "Gaming", "Fest Team", "Other"],
        required: [true, "Catergory is required"]
    },
    contactEmail: {
        type: String,
        required: [true, "Contact email is required"]
    },
    discordWebhook: {
        type: String,
        default: '',
    },
})

// FOR THE VALIDATION OF CATEGORY TO ALWAYS BE IN LIST :
organizerSchema.path("category").validate(function (value) {
    const allowed = [
        "Technical",
        "Cultural",
        "Sports",
        "Literary",
        "Design",
        "Management",
        "Social",
        "Gaming",
        "Fest Team"
    ];

    if (!value) throw new Error("Organizer category is required");

    return allowed.includes(value);
}, "Invalid organizer category");

// VALIDATION FOR CONTACT EMAIL & ORGANIZER NAME :
organizerSchema.pre("validate", function () {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (this.contactEmail && !emailRegex.test(this.contactEmail)) {
        throw new Error("Invalid contact email format");
    }

    if (this.organizerName.length <= 3 || this.organizerName.length > 20) {
        throw new Error("Organizer Name should contains atleast 4 characters and atmost 20 characters.")
    }

    if (this.description.length <= 14 || this.description.length > 1000) {
        throw new Error('Organizer name should contain atleast 15 characters and atmost 500 characters.')
    }
});

const organizer = user.discriminator('Organizer', organizerSchema)
export default organizer