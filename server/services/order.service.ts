import { NextFunction, Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import OrderModel from "../models/order.model";

// create New order

export const newOrder = catchAsyncErrors(async (data: any, res: Response, next: NextFunction,) => {
    const order = await OrderModel.create(data);
    res.status(201).json({
        success: true,
        order
    })
});



// Get all orders
export const getAllOrdersService = async (res: Response) => {
    const orders = await OrderModel.find().sort({ createdAt: -1 });

    res.status(201).json({
        success: true,
        orders
    })

}