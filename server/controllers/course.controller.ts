import { Request, Response, NextFunction } from "express";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import { error } from "console";
import mongoose from "mongoose";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notification.model";
// upload course
export const uploadCourse = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;
            const thumbnail = data.thumbnail;
            if (thumbnail) {
                const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                    folder: "courses",
                });
                data.thumbnail = {
                    public_id: myCloud.public_id,
                    url: myCloud.url,
                };
            }
            createCourse(data, res, next);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// edit course
export const editCourse = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;
            const thumbnail = data.thumbnail;
            if (thumbnail) {
                await cloudinary.v2.uploader.destroy(thumbnail.public_id);
                const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                    folder: "courses",
                });
                data.thumbnail = {
                    public_id: myCloud.public_id,
                    url: myCloud.url,
                };
            }

            const courseId = req.params.id;
            const course = await CourseModel.findByIdAndUpdate(
                courseId,
                {
                    $set: data,
                },
                { new: true }
            );
            res.status(201).json({
                success: true,
                course,
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// get single course === without purchasing

export const getSingleCourse = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courseId = req.params.id;
            const isCacheExist = await redis.get(courseId);

            if (isCacheExist) {
                const course = JSON.parse(isCacheExist);

                res.status(200).json({
                    success: true,
                    course,
                });
            } else {
                const course = await CourseModel.findById(req.params.id).select(
                    "-courseData.videoUrl -courseData.questions -courseData.suggestion -courseData.links"
                );

                await redis.set(courseId, JSON.stringify(course));
                res.status(200).json({
                    success: true,
                    course,
                });
            }
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// get all course === without purchasing

export const getAllCourses = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const isCacheExist = await redis.get("allCourses");

            if (isCacheExist) {
                const courses = JSON.parse(isCacheExist);
                res.status(200).json({
                    success: true,
                    courses,
                });
            } else {
                const courses = await CourseModel.find().select(
                    "-courseData.videoUrl -courseData.questions -courseData.suggestion -courseData.links"
                );

                await redis.set("allCourses", JSON.stringify(courses));

                res.status(200).json({
                    success: true,
                    courses,
                });
            }
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// get course content only for valid user
export const getCourseByUser = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userCourseList = req.user?.courses;
            const courseId = req.params.id;

            const courseExist = userCourseList?.find(
                (course: any) => course._id.toString() === courseId
            );

            if (!courseExist) {
                return next(
                    new ErrorHandler("You are not eligible to access this course", 404)
                );
            }

            const course = await CourseModel.findById(courseId);

            const content = course?.courseData;
            res.status(200).json({
                success: true,
                content,
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// add questions in course
interface IAddQuestionData {
    question: string;
    courseId: string;
    contentId: string;
}

export const addQuestions = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { question, courseId, contentId }: IAddQuestionData = req.body;
            const course = await CourseModel.findById(courseId);

            if (!mongoose.Types.ObjectId.isValid(contentId)) {
                return next(new ErrorHandler("Invalid Content Id", 400));
            }

            const courseContent = course?.courseData.find((item: any) =>
                item._id.equals(contentId)
            );

            if (!courseContent) {
                return next(new ErrorHandler("Invalid Content Id", 500));
            }

            // create new question object
            const newQuestion: any = {
                user: req.user,
                question,
                questionReplies: [],
            };

            // add question to course content
            courseContent.questions.push(newQuestion);

            await NotificationModel.create({
                user: req.user?._id,
                title: "New Question Recieved",
                message: `You have a new question in ${courseContent?.title}`

            });
            // save the updated course
            await course?.save();
            res.status(200).json({
                success: true,
                course,
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// add answering course questions
interface IAddAnswerData {
    answer: string;
    courseId: string;
    contentId: string;
    questionId: string;
}

export const addAnswer = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { answer, courseId, contentId, questionId }: IAddAnswerData =
                req.body;

            const course = await CourseModel.findById(courseId);

            if (!mongoose.Types.ObjectId.isValid(contentId)) {
                return next(new ErrorHandler("Invalid Content Id", 400));
            }

            const courseContent = course?.courseData.find((item: any) =>
                item._id.equals(contentId)
            );

            if (!courseContent) {
                return next(new ErrorHandler("Invalid Content Id", 500));
            }

            const question = courseContent?.questions?.find((item: any) =>
                item._id.equals(questionId)
            );

            if (!question) {
                return next(new ErrorHandler("Question not found", 404));
            }

            // create answer object
            const newAnswer: any = {
                user: req.user,
                answer,
            };

            // add answer in course content
            question.questionReplies?.push(newAnswer);

            await course?.save();

            if (req.user?._id === question.user._id) {
                // create a ntification
                await NotificationModel.create({
                    user: req.user?._id,
                    title: "New Question Reply Recieved",
                    message: `You have a new question reply in ${courseContent?.title}`
                });
            } else {
                const data = {
                    name: question.user.name,
                    title: courseContent.title,
                };

                const html = await ejs.renderFile(
                    path.join(__dirname, "../mails/question_reply.ejs"),
                    data
                );
                try {
                    await sendMail({
                        email: question.user.email,
                        subject: "Question Reply",
                        template: "question_reply.ejs",
                        data,

                    })
                } catch (error: any) {
                    return next(new ErrorHandler(error.message, 500));

                }

            }
            res.status(200).json({
                success: true,
                course
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    }
);

// add review in course
interface IAddReviewData {
    review: string;
    rating: number;
    userId: string;
}


export const addReview = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user?.courses;

        const courseId = req.params.id;

        // check if the courseId already exist in user course List based on _id
        const courseExist = userCourseList?.some((course: any) => course._id.toString() === courseId.toString());

        if (!courseExist) {
            return next(new ErrorHandler("You Are Not Eligible For This Course", 404));
        }

        const course = await CourseModel.findById(courseId);

        const { review, rating } = req.body as IAddReviewData;

        const reviewData: any = {
            user: req.user,
            comment: review,
            rating,
        }

        course?.reviews.push(reviewData);

        let avg = 0;
        course?.reviews.forEach((rev: any) => {
            avg += rev.rating;
        });
        if (course) {
            course.ratings = avg / course.reviews.length;
        }

        await course?.save();

        const notification = {
            title: "New Review Recieved",
            message: `${req.user?.name} has given a review in ${course?.name}`,

        };

        // create notification

        res.status(200).json({
            success: true,
            course,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// add reply in review by admin
interface IAddReviewData {
    comment: string;
    courseId: string;
    reviewId: string;
}

export const addReplyToReview = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { comment, courseId, reviewId } = req.body as IAddReviewData;

        const course = await CourseModel.findById(courseId);

        if (!course) {
            return next(new ErrorHandler("Course Not Found", 404));
        }

        const review = course?.reviews?.find((rev: any) => rev._id.toString() === reviewId);

        if (!review) {
            return next(new ErrorHandler("Review Not Found", 404));
        }

        const replyData: any = {
            user: req.user,
            comment
        };
        if (!review.commentReplies) {
            review.commentReplies = [];
        }
        review.commentReplies?.push(replyData);
        await course.save();

        res.status(200).json({
            success: true,
            course
        });


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});



// Get all courses => admin
export const getAllCoursesAdmin = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        getAllCoursesService(res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    };
});



// Delete course ==>Admin

export const deleteCourse = catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const course = await CourseModel.findById(id);

        if (!course) {
            return next(new ErrorHandler("Course Not Found", 400));
        }

        await course.deleteOne({ id });
        await redis.del(id);


        res.status(200).json({
            success: true,
            message: "Course Deleted Successfully",
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));

    }
});