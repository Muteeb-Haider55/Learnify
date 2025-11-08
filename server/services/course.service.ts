import { Response } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import CourseModel from "../models/course.model";



// create course
export const createCourse = catchAsyncErrors(async (data: any, res: Response) => {
    const course = await CourseModel.create(data);
    res.status(201).json({
        success: true,
        course
    })
})