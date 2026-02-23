import mongoose from "mongoose";
import user from "./userSchema.js";

const adminSchema = new mongoose.Schema({})
const admin = user.discriminator("Admin", adminSchema)
export default admin