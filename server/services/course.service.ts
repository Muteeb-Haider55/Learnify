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

// Get all courses
export const getAllCoursesService = async (res: Response) => {
    const courses = await CourseModel.find().sort({ createdAt: -1 });

    res.status(201).json({
        success: true,
        courses
    })

}