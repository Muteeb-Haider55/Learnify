import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middleware/error";
import userRouter from "./route/user.route";
import courseRouter from "./route/course.route";
import orderRouter from "./route/order.route";
import notificationRouter from "./route/notification.route";
import analyticsRouter from "./route/analytics.route";


export const app = express();

// body parser
app.use(express.json({ limit: "50mb" }));

// cookie parser
app.use(cookieParser());

// cors =>cross origin resource sharing
app.use(cors({
    origin: process.env.ORIGIN,
    credentials: true,
}));

// routes
app.use('/api/v1', userRouter, courseRouter, orderRouter, notificationRouter, analyticsRouter);




// test api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        message: "API is working",
    });
});

// unknown routes — use a middleware that doesn't rely on route pattern parsing
app.use((req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);
});

app.use(ErrorMiddleware);
