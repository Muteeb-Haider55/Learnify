
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import { Request, Response, NextFunction } from "express";
import OrderModel, { IOrder } from "../models/order.model";
import ErrorHandler from "../utils/ErrorHandler"
import userModel, { IUser } from "../models/user.model";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import CourseModel from "../models/course.model";
import { getAllOrdersService, newOrder } from "../services/order.service";
import NotificationModel from "../models/notification.model";

// create order
export const createOrder = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courseId, payment_info } = req.body as IOrder;

        const user = await userModel.findById(req.user?._id);

        const courseExistInUser = user?.courses.some((course: any) => course._id.toString() === courseId);

        if (courseExistInUser) {
            return next(new ErrorHandler("You Already Have This Course", 400));
        }

        const course = await CourseModel.findById(courseId);

        if (!course) {
            return next(new ErrorHandler("Course Not Found", 404));
        }

        const data: any = {
            courseId: course._id,
            userId: user?._id,
            payment_info,
        };



        const mailData = {
            order: {
                _id: course._id.toString().slice(0, 6),
                name: course.name,
                price: course.price,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

            }
        }
        const html = await ejs.renderFile(path.join(__dirname, '../mails/order.ejs'), { order: mailData });

        try {
            if (user) {
                await sendMail({
                    email: user.email,
                    subject: "Order Confirmation",
                    template: "order.ejs",
                    data: mailData
                })
            }
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }

        user?.courses.push(course?._id);

        await user?.save();

        await NotificationModel.create({
            user: user?._id,
            title: "New Order",
            message: `You have a new order from ${course?.name}`

        });
        if (course.purchased) {
            course.purchased += 1;
        }
        await course.save();

        newOrder(data, res, next);

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});




// Get all orders => admin
export const getAllOrdersAdmin = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        getAllOrdersService(res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    };
});