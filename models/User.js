import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError, UnauthenticatedError } from '../errors/index.js';


const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    password: {
        type: String
    },
    name: {
        type: String,
        maxLength: 50,
        minLength: 3
    },
    login_pin: {
        type: String,
    },
    phone_number: {
        type: String,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number without spaces and special characters'],
        unique: true,
        sparse: true
    },
    date_of_birth: Date,
    biometric_key: String,
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    wrong_pin_attempts: {
        type: Number,
        default: 0
    },
    blocked_until_pin: {
        type: Date,
        default: null
    },
    wrong_password_attempts: {
        type: Number,
        default: 0
    },
    blocked_until_password: {
        type: Date,
        default: null
    },
    balance: {
        type: Number,
        default: 50000.00
    }
}, { timestamps: true });


UserSchema.pre('save', async function () {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});

UserSchema.pre('save', async function () {
    if (this.isModified('login_pin')) {
        const salt = await bcrypt.genSalt(10);
        this.login_pin = await bcrypt.hash(this.login_pin, salt);
    }
});

UserSchema.statics.updatePIN = async function (email, newPin) {
    try {
        const user = await this.findOne({ email });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        const isSamePin = await bcrypt.compare(newPin, user.login_pin);
        if (isSamePin) {
            throw new BadRequestError("The new pin must not match the old pin");
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(newPin, salt);

        await this.updateOne({ email }, { login_pin: hashedPin, wrong_pin_attempts: 0, blocked_until_pin: null });

        return { success: true, message: "PIN updated successfully" };
    } catch (error) {
        throw error;
    }
}

UserSchema.statics.updatePassword = async function (email, newPassword) {
    try {
        const user = await this.findOne({ email });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new BadRequestError("The new password must not match the old password");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await this.updateOne({ email }, { password: hashedPassword, wrong_password_attempts: 0, blocked_until_password: null });

        return { success: true, message: "Password updated successfully" };
    } catch (error) {
        throw error;
    }
}


UserSchema.methods.comparePassword = async function (enteredPw){
    if(this.blocked_until_password && this.blocked_until_password > new Date()) {
        throw new UnauthenticatedError("Invalid login attempts exceeded, Try again in 30 minutes");
    }

    const isMatch = await bcrypt.compare(enteredPw, this.password);
    if(!isMatch) {
        this.wrong_password_attempts += 1;
        if(this.wrong_password_attempts >= 3) {
            this.blocked_until_password = new Date(Date.now() + 30 * 60 * 1000);
            await this.save();
            this.wrong_password_attempts = 0;
        }
        await this.save();
    }else{
        this.wrong_password_attempts = 0;
        this.blocked_until_password = null;
        await this.save();
    }
    return isMatch;
}


UserSchema.methods.comparePin = async function comparePin(enteredPw){
    if(this.blocked_until_pin && this.blocked_until_pin > new Date()) {
        throw new UnauthenticatedError("Invalid login attempts exceeded, Try again in 30 minutes");
    }

    const isMatch = await bcrypt.compare(enteredPw, this.password);
    if(!isMatch) {
        this.wrong_pin_attempts += 1;
        if(this.wrong_pin_attempts >= 3) {
            this.blocked_until_pin = new Date(Date.now() + 30 * 60 * 1000);
            await this.save();
            this.wrong_pin_attempts = 0;
        }
        await this.save();
    }else{
        this.wrong_pin_attempts = 0;
        this.blocked_until_pin = null;
        await this.save();
    }
    return isMatch;
}


UserSchema.methods.createAccessToken = function () {
    return jwt.sign({ userId: this._id, name: this.name }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
}


UserSchema.methods.createRefreshToken = function () {
    return jwt.sign({ userId: this._id, name: this.name }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });
}

const User = mongoose.model("User", UserSchema);


export default User;