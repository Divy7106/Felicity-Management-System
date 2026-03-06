import FileModel from "../schema/fileSchema.js"

/**
 * Save a file buffer to MongoDB.
 * @param {Buffer} buffer  - file data (from multer memoryStorage)
 * @param {string} originalName - original file name
 * @param {string} contentType  - MIME type
 * @param {string} folder - logical folder (event / chat / registration)
 * @returns {string} public URL path: /api/files/<id>
 */
export async function saveFile(buffer, originalName, contentType, folder = "misc") {
    const doc = await FileModel.create({
        filename: originalName,
        contentType,
        data: buffer,
        folder,
    })
    return `/api/files/${doc._id}`
}

/**
 * Delete a file from MongoDB by its URL path or raw id.
 * Silently ignores if the file doesn't exist.
 */
export async function deleteFile(urlOrId) {
    if (!urlOrId) return
    const id = urlOrId.replace(/^\/api\/files\//, "")
    try {
        await FileModel.findByIdAndDelete(id)
    } catch (e) {
        // ignore bad ids
    }
}
