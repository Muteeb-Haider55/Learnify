require('dotenv').config();
import { Request, Response, NextFunction } from 'express'
import ErrorHandler from '../utils/ErrorHandler';
import { catchAsyncErrors } from './catchAsyncErrors';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { redis } from '../utils/redis';

export const isAuthenticated = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token as string;
    if (!access_token) {
        return next(new ErrorHandler('Please login to access this resource', 401));
    }

    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;
    if (!decoded) {
        return next(new ErrorHandler('Access Token is not valid', 400));
    }

    const user = await redis.get(decoded.id);
    if (!user) {
        return next(new ErrorHandler('User not found or session expired', 401));
    }
    req.user = JSON.parse(user);
    next();
});

// validate user roles
export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user?.role || '')) {
            return next(new ErrorHandler(`Role : ${req.user?.role} is not allowed to access this resourse`, 403))
        }
        next();
    }
}