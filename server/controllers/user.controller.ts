require("dotenv").config();
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getUserById } from "../services/user.service";
import cloudinary from 'cloudinary';

// Register User
interface IRegestrationBody {
    name: string;
    email: string;
    password: string;
    avatar?: string;
}
export const registrationUser = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { name, email, password } = req.body;
            const isEmailExist = await userModel.findOne({ email });
            if (isEmailExist) {
                return next(new ErrorHandler("User Already Exist", 400));
            }
            const user: IRegestrationBody = {
                name,
                email,
                password,
            };
            const activatioToken = createActivationToken(user);
            const activationCode = activatioToken.activationCode;
            const data = { user: { name: user.name }, activatioToken };
            const html = await ejs.renderFile(
                path.join(__dirname, "../mails/activation-mail.ejs"),
                data
            );
            try {
                await sendMail({
                    email: user.email,
                    subject: "Activate Your Account",
                    template: "activation-mail.ejs",
                    data,
                });
                res.status(201).json({
                    success: true,
                    message: `Please check your email: ${user.email} to activate your account`,
                    activatioToken: activatioToken.token,
                });
            } catch (error: any) {
                return next(new ErrorHandler(error.message, 400));
            }
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);

interface IActivationToken {
    token: string;
    activationCode: string;
}
export const createActivationToken = (user: any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign(
        {
            user,
            activationCode,
        },
        process.env.ACTIVATION_SECRET as Secret,
        {
            expiresIn: "5m",
        }
    );
    return { token, activationCode };
};

//Activaye user
interface IActivationRequest {
    activation_token: string;
    activation_code: string;
}

export const activateUser = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { activation_token, activation_code } =
                req.body as IActivationRequest;

            const newUser: { user: IUser; activationCode: string } = jwt.verify(
                activation_token,
                process.env.ACTIVATION_SECRET as string
            ) as { user: IUser; activationCode: string };

            if (newUser.activationCode !== activation_code) {
                return next(new ErrorHandler('Invalid Activation Code', 400))
            }
            const { name, email, password } = newUser.user;

            const existUser = await userModel.findOne({ email });
            if (existUser) {
                return next(new ErrorHandler('User Already Exist With This Email', 400))
            }
            const user = await userModel.create({
                name,
                email,
                password,
            });
            res.status(200).json({
                success: true,
            })
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);

// user login
interface ILoginRequest {
    email: string;
    password: string;
}

export const loginUser = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body as ILoginRequest;
        if (!email || !password) {
            return next(new ErrorHandler("Please Enter Email and Password", 400));
        }

        const user = await userModel.findOne({ email }).select("+password");
        if (!user) {
            return next(new ErrorHandler("Invalid Email or Password", 400));
        }

        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Invalid Email or Password", 400));
        }

        sendToken(user, 200, res);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));

    }
});


export const logoutUser = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.cookie("access_token", "", { maxAge: 1 });
        res.cookie("refresh_token", "", { maxAge: 1 });
        const userId = req.user?._id || "";
        redis.del(userId)
        res.status(200).json({
            success: true,
            message: 'User logged out successfully',
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));

    }
});

// update access token
export const updateAccessToken = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refresh_token = req.cookies.refresh_token as string;
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload;

        const message = "Could not refresh token";
        if (!decoded) {
            return next(new ErrorHandler(message, 400));
        }
        const session = await redis.get(decoded.id as string);
        if (!session) {
            return next(new ErrorHandler(message, 400));
        }
        const user = JSON.parse(session);

        const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as string, {
            expiresIn: '5m',
        });

        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string, {
            expiresIn: '3d',
        });
        req.user = user;
        res.cookie("access_token", accessToken, accessTokenOptions);
        res.cookie("refresh_token", refreshToken, refreshTokenOptions);
        res.status(200).json({
            success: true,
            accessToken,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));

    }
})

// get user info;
export const getUserInfo = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {

    try {
        const userId = req.user?._id;
        getUserById(userId as string, res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

interface ISocialAuthBody {
    email: string;
    name: string;
    avatar: string;
}
// social auth
export const socialAuth = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, name, avatar } = req.body as ISocialAuthBody;
        const user = await userModel.findOne({ email });
        if (!user) {
            const newUser = await userModel.create({ email, name, avatar });
            sendToken(newUser, 200, res)
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    };
});

// update user info
interface IUpdateUserInfo {
    name: string;
    email: string;
}
export const updateUserInfo = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email } = req.body as IUpdateUserInfo;
        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        if (email && user) {
            const isEmailExist = await userModel.findOne({ email });
            if (isEmailExist) {
                return next(new ErrorHandler("User  Already Exist With This Email", 400));
            }
            user.email = email;
        }

        if (name && user) {
            user.name = name;
        }

        await user?.save();

        await redis.set(userId, JSON.stringify(user));

        res.status(201).json({
            success: true,
            user,

        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));

    }
});

// update user pasword
interface IUpdatePasword {
    oldPassword: string;
    newPassword: string;

}

export const updatePassword = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { oldPassword, newPassword } = req.body as IUpdatePasword;

        if (!oldPassword || !newPassword) {
            return next(new ErrorHandler("Enter Old && New Password", 400));
        }

        const user = await userModel.findById(req.user?._id).select("+password");

        if (user?.password === undefined) {
            return next(new ErrorHandler("Invalid User", 400));
        }

        const isPasswordMatch = await user?.comparePassword(oldPassword);

        if (!isPasswordMatch) {
            return next(new ErrorHandler("Invalid Old Password", 400));
        }

        user.password = newPassword;
        await user?.save();
        await redis.set(String(req.user?._id), JSON.stringify(user))
        res.status(201).json({
            success: true,
            user,
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    };
});

interface IUpdateProfilePicture {
    avatar: string;
}
// updtate profile picture
export const updateProfilePicture = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body;

        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        if (avatar && user) {
            if (user?.avatar?.public_id) {
                await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);

                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.url,
                }

            } else {
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.url,
                }
            }
        }
        await user?.save();

        await redis.set(userId as string, JSON.stringify(user));
        return res.status(201).json({
            success: true,
            user
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    };
});