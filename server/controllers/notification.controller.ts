import { NextFunction, Request, Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import NotificationModel from "../models/notification.model";
import cron from "node-cron"



// Get all notifications only admin
export const getNotifications = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notifications = await NotificationModel.find().sort({ createdAt: -1 });
        res.status(201).json({
            success: true,
            notifications
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// update notifiaction status
export const updateNotifiactions = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notification = await NotificationModel.findById(req.params.id);
        if (!notification) {
            return next(new ErrorHandler("Notification Not Found", 500));
        }
        else {
            notification?.status ? notification.status = 'read' : notification?.status;
        }

        await notification.save();

        const notifiactions = await NotificationModel.find().sort({ createdAt: -1 });

        res.status(201).json({
            success: true,
            notifiactions,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


// delete notifiaction => admin

cron.schedule("0 0 0 * * *", async () => {
    const thirtDayAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 100);
    await NotificationModel.deleteMany({ status: "read", createdAt: { $lt: thirtDayAgo } })
    console.log("Delete Read Notifications")
});