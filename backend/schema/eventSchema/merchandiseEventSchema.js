import mongoose from "mongoose";
import event from "./eventSchema.js";

const merchandiseEventSchema = new mongoose.Schema({
    merchandiseItems: [
        {
            itemId: { type: String, required: true },
            name: { type: String, required: true },
            basePrice: { type: Number, required: true },
            variants: [
                {
                    variantId: { type: String, required: true },
                    size: { type: String },
                    color: { type: String },
                    stock: { type: Number, required: true },
                    coverImage: { type: String, required: true }
                }
            ],
            perParticipantLimit: {
                type: Number,
                default: 1,
            }
        }
    ]
})

// Merchandise event specific validations
merchandiseEventSchema.pre('save', async function (next) {

    if (this.isDraft) {
    } else {

        // Check if there are merchandise items
        if (!this.merchandiseItems || this.merchandiseItems.length === 0) {
            throw new Error("Merchandise events must have at least one item.")
        }

        // Validate each merchandise item using for loop
        for (let i = 0; i < this.merchandiseItems.length; i++) {
            const item = this.merchandiseItems[i]

            // Check if item has name
            if (!item.name || item.name.trim() === '') {
                throw new Error(`Merchandise Item ${i + 1}: Name is required.`)
            }

            // Check if item has valid basePrice
            if (typeof item.basePrice !== 'number' || item.basePrice < 0) {
                throw new Error(`Merchandise Item ${i + 1} (${item.name}): Base price must be a non-negative number.`)
            }

            // Check if item has valid perParticipantLimit
            if (typeof item.perParticipantLimit !== 'number' || item.perParticipantLimit <= 0) {
                throw new Error(`Merchandise Item ${i + 1} (${item.name}): Per participant limit must be greater than 0.`)
            }

            // Check if item has at least one variant
            if (!item.variants || item.variants.length === 0) {
                throw new Error(`Merchandise Item ${i + 1} (${item.name}): Must have at least one variant.`)
            }

            // Validate each variant using for loop
            for (let j = 0; j < item.variants.length; j++) {
                const variant = item.variants[j]

                // Check if variant has variantId
                if (!variant.variantId || variant.variantId.trim() === '') {
                    throw new Error(`Merchandise Item ${i + 1} (${item.name}), Variant ${j + 1}: Variant ID is required.`)
                }

                // Check if variant has size
                if (!variant.size || variant.size.trim() === '') {
                    throw new Error(`Merchandise Item ${i + 1} (${item.name}), Variant ${j + 1}: Size is required.`)
                }

                // Check if variant has color
                if (!variant.color || variant.color.trim() === '') {
                    throw new Error(`Merchandise Item ${i + 1} (${item.name}), Variant ${j + 1}: Color is required.`)
                }

                // Check if variant has valid stock
                if (typeof variant.stock !== 'number' || variant.stock < 0) {
                    throw new Error(`Merchandise Item ${i + 1} (${item.name}), Variant ${j + 1}: Stock must be a non-negative number.`)
                }
            }
        }
    }

})

const merchandiseEvent = event.discriminator("Merchandise", merchandiseEventSchema)
export default merchandiseEvent