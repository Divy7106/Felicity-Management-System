#!/usr/bin/env node

/**
 * Standalone script to create an Admin account in the database.
 * 
 * Usage:
 *   node createAdmin.js
 * 
 * Reads MONGO_URL from backend/.env and prompts for email & password via stdin.
 */

import dotenv from "dotenv"
import mongoose from "mongoose"
import readline from "readline"
import admin from "./schema/userSchema/adminSchema.js"
import "./schema/userSchema/userSchema.js"

dotenv.config()

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

function ask(question) {
    return new Promise((resolve) => rl.question(question, resolve))
}

async function main() {
    const MONGO_URL = process.env.MONGO_URL
    if (!MONGO_URL) {
        console.error("Error: MONGO_URL is not set in the .env file.")
        process.exit(1)
    }

    try {
        await mongoose.connect(MONGO_URL)
        console.log("Connected to MongoDB.")
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err.message)
        process.exit(1)
    }

    const email = await ask("Enter admin email: ")
    const password = await ask("Enter admin password: ")

    if (!email || !password) {
        console.error("Error: Email and password are required.")
        rl.close()
        await mongoose.disconnect()
        process.exit(1)
    }

    try {
        const newAdmin = new admin({
            email,
            password,
            role: "Admin",
        })

        const saved = await newAdmin.save()
        console.log("Admin created successfully:", saved.email)
    } catch (err) {
        console.error("Failed to create admin:", err.message)
    } finally {
        rl.close()
        await mongoose.disconnect()
        process.exit(0)
    }
}

main()
