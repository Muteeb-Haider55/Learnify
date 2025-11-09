import express from "express";
import { addAnswer, addQuestions, editCourse, getAllCourses, getCourseByUser, getSingleCourse, uploadCourse } from "../controllers/course.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const courseRouter = express.Router();

courseRouter.post(
    '/create-course',
    isAuthenticated,
    authorizeRoles("admin"),
    uploadCourse
);

courseRouter.put(
    '/edit-course/:id',
    isAuthenticated,
    authorizeRoles("admin"),
    editCourse
);

courseRouter.get(
    '/get-course/:id',
    getSingleCourse
);

courseRouter.get(
    '/get-all-courses',
    getAllCourses
);

courseRouter.get(
    '/get-courses-content/:id',
    isAuthenticated,
    getCourseByUser
);

courseRouter.put(
    '/add-question',
    isAuthenticated,
    addQuestions
);
courseRouter.put(
    '/add-answer',
    isAuthenticated,
    addAnswer
);


export default courseRouter;