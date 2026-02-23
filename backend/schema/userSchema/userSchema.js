import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const option = {
    discriminatorKey: "role",
    timestamps: true,
}

const userSchema = new Schema(
    {
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true    
        },

        password: {
            type: String,
            required: [true, "Password is required"]
            
        },
        role: {
            type: String,
            enum: ['Participant', 'Organizer', 'Admin']
        }
    }, option
)

// VALIDATING ROLE :
userSchema.path("role").validate(function (value) {
    const allowed = ['Participant', 'Organizer', 'Admin']
    if (!value) throw new Error("User role is required");
    return allowed.includes(value);
}, "Invalid role");

// VALIDATING OTHER INFORMATION :
userSchema.pre("validate", function () {
    const user = this;

    // CONVERTING EMAIL IN LOWER_CASE
    if (user.email) user.email = user.email.toLowerCase();

    // EMAIL FORMAT CHECK THROUGH REGEX
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(user.email)) {
        throw new Error("Invalid email format");
    }

    const domain = user.email.split("@")[1];
    const allowedDomains = [
            "student.iiit.ac.in",
            "research.iiit.ac.in",
            "alumni.iiit.ac.in",
            "cie.iiit.ac.in",
            "dfl.iiit.ac.in",
            "iiit.ac.in"
        ]

    // IIIT DOMAIN RULE VALIDATION CHECKING :
    if (user.role === "Participant" && user.participantType === "IIITH") {
        if (!allowedDomains.includes(domain)) {
            throw new Error("IIIT participants must use official IIIT email");
        }
    }

    if (user.role === 'Participant' && allowedDomains.includes(domain) && user.participantType === 'Non-IIITH') {
        throw new Error("Please select IIITH if you are signing using IIITH email.")
    }

    // NAME VALIDATION
    if (user.role === "Participant") {

        const nameRegex = /^.{3,30}$/;

        if (!user.firstName || !nameRegex.test(user.firstName)) {
            throw new Error("First name must be 3–30 characters");
        }

        if (!user.lastName || !nameRegex.test(user.lastName)) {
            throw new Error("Last name must be 3–30 characters");
        }

        // CONTACT NUMBER VALIDATION
        const phoneRegex = /^[0-9]{10}$/;
        if (user.contactNumber && !phoneRegex.test(user.contactNumber)) {
            throw new Error("Contact number must be exactly 10 digits");
        }
    }

    if (user.role === "Organizer") {
        const nameRegex = /^.{3,30}$/;

        if (!user.organizerName || !nameRegex.test(user.organizerName)) {
            throw new Error("Organizer name must be 3–30 characters");
        }
    }
});

// HASHING PASSWORD AND SAVING USER INFO IN DATABASE :
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    try {
        const saltRounds = 10;
        this.password = await bcrypt.hash(this.password, saltRounds);   
    } catch (err) {
        throw new Error("Failed to hash password");
    }
})

const user = mongoose.model("User", userSchema)
export default user