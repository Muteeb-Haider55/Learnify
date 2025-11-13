import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { genrateLast12MonthData } from "../utils/analytics.genrerator";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import OrderModel from "../models/order.model";


// get User analytics =>> admin
export const getUserAnalytics = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const users = await genrateLast12MonthData(userModel);
        res.status(200).json({
            success: true,
            users
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// get Courses analytics =>> admin

export const getCoursesAnalytics = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const courses = await genrateLast12MonthData(CourseModel);
        res.status(200).json({
            success: true,
            courses,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


// get orders analytics =>> admin

export const getOrdersAnalytics = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const courses = await genrateLast12MonthData(OrderModel);
        res.status(200).json({
            success: true,
            courses,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});