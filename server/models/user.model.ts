require('dotenv').config()
import mongoose, { Document, Model } from "mongoose";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken';

const emailRegexPattern: RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface IUser extends Document {
    name: string,
    email: string,
    password: string,
    avatar: {
        public_id: string,
        url: string,
    },
    role: string,
    isVerified: boolean,
    courses: Array<{ courseId: string }>;
    comparePassword: (password: string) => Promise<boolean>;
    SignAccessToken: () => string;
    SignRefreshToken: () => string;

}

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please Enter Your Name'],
    },
    email: {
        type: String,
        required: [true, 'Please Enter Yur Email Address'],
        validate: {
            validator: function (value: string) {
                return emailRegexPattern.test(value);
            },
            message: 'Plaese Enter a Valid Email',
        },
        unique: true,
    },
    password: {
        type: String,

        minLength: [6, 'Password Contains Atleast 6 Characters'],
        select: false,
    },
    avatar: {
        public_id: String,
        url: String,
    },
    role: {
        type: String,
        default: 'user',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    courses: [
        {
            courseId: String,
        }
    ],
}, { timestamps: true })

// Hash Password befor saving
userSchema.pre<IUser>('save', async function () {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

// sign access token
userSchema.methods.SignAccessToken = function () {
    return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN || '', {
        expiresIn: '5m'
    });
};

// Sign refresh token 
userSchema.methods.SignRefreshToken = function () {
    return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN || '', {
        expiresIn: '3d',
    });
};
// compare password
userSchema.methods.comparePassword = async function (this: IUser, enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password)
}

const userModel = mongoose.model<IUser>('User', userSchema as mongoose.Schema<IUser>)
export default userModel;