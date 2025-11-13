import express from "express"
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getNotifications, updateNotifiactions } from "../controllers/notification.controller";

const notificationRouter = express.Router();

notificationRouter.get('/get-all-notifications', isAuthenticated, authorizeRoles('admin'), getNotifications);
notificationRouter.put('/update-notification/:id', isAuthenticated, authorizeRoles('admin'), updateNotifiactions);

export default notificationRouter;