import mongoose from "mongoose"

const fileSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
    folder: { type: String, default: "misc" }, // event, chat, registration
}, { timestamps: true })

const FileModel = mongoose.model("File", fileSchema)

export default FileModel
