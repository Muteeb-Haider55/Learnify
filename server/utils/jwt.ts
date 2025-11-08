require('dotenv').config();

import { Response } from "express";
import { IUser } from "../models/user.model"
import { redis } from "./redis";

interface ITokenOpions {
    expires: Date;
    maxAge: number;
    httpOnly: boolean;
    sameSite: 'lax' | 'strict' | 'none' | undefined;
    secure: boolean;
}

// parse envoirment variables to integrate that fall back 
export const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_Expire || '300', 10);
export const refreshTokenExpire = parseInt(process.env.REFRESH_Token_Expire || '1200', 10);

// option for cookies
export const accessTokenOptions: ITokenOpions = {
    expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
    maxAge: accessTokenExpire * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
};

export const refreshTokenOptions: ITokenOpions = {
    expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: false,

};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();

    // upload session to redis
    redis.set(user._id.toString(), JSON.stringify(user) as any)



    // only set security in production
    if (process.env.NODE_ENV === 'production') {
        accessTokenOptions.secure = true;
        refreshTokenOptions.secure = true;

    }

    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions);

    res.status(statusCode).json({
        success: true,
        user,
        accessToken,
    });

};