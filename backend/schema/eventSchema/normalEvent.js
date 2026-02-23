import mongoose from 'mongoose'
import event from './eventSchema.js'

const normalEventSchema = new mongoose.Schema({})
const normalEvent = event.discriminator("Normal", normalEventSchema)
export default normalEvent