import jwt from 'jsonwebtoken'
import bcrypt from "bcrypt";
import crypto from 'crypto'

function genToken(email, userId) {
    const token = jwt.sign({
        email: email,
        userId: userId,
    },
    process.env.SECRET_KEY,
    {algorithm: process.env.JWT_ALGORITHM || 'HS512', expiresIn: process.env.JWT_EXPIRY || '7d'});

    return token;
}

function verifyToken(token) {
    const userInfo = jwt.verify(token, process.env.SECRET_KEY)
    return userInfo
}

async function getUserLogin(userModel, email, password, res, sendResponse = 1) {
    try {
        const user = await userModel.findOne({ email })

        if (!user) {
            throw new Error("Invalid Credentials.");
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            throw new Error("Invalid Credentials.");
        }

        const token = genToken(user.email, user._id);

        res.cookie("sessionId", token, {
            httpOnly: true,
            secure: process.env.COOKIE_SECURITY === "true",
            sameSite: process.env.COOKIE_SAME_SITE || "lax",
            maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000,
        });
        // Store token on res.locals so controllers can access it
        res.locals.authToken = token;
        if(sendResponse)
            res.status(200).json({ msgType: "Success", msg: "Login successful", err: undefined, response: user, token: token });

    } catch (err) {
        if (sendResponse)
            res.status(400).json({
                msgType: "Error",
                msg: "Invalid Credentials",
                error: err.message
            });
        else {
            throw new Error("User Login failed due to unknown error.")
        }
    }
}

function generatePassword(length = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
  
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    password += chars[randomIndex];
  }
  return password;
}

export {
    verifyToken,
    getUserLogin,
    generatePassword,
}