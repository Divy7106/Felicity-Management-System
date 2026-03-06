import { Router } from "express"
import FileModel from "../schema/fileSchema.js"

const fileRouter = Router()

// Serve files stored in MongoDB — public (no auth needed for images/PDFs)
fileRouter.get("/:id", async (req, res) => {
    try {
        const file = await FileModel.findById(req.params.id).lean()
        if (!file) return res.status(404).json({ msg: "File not found." })

        // file.data from MongoDB comes as BSON Binary — ensure it's a proper Buffer
        const buffer = file.data?.buffer || Buffer.from(file.data)

        res.set("Content-Type", file.contentType)
        res.set("Content-Length", buffer.length)
        res.set("Content-Disposition", `inline; filename="${file.filename}"`)
        res.set("Cache-Control", "public, max-age=31536000, immutable")
        return res.send(buffer)
    } catch (err) {
        return res.status(404).json({ msg: "File not found." })
    }
})

export default fileRouter
