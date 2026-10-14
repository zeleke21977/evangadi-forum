import express from "express"
import authRoutes from "./auth/routes/auth.route.js";
import questionRoutes from "./question/routes/question.route.js"
import answerRoutes from "./answer/routes/answer.route.js";
import ragRouter from "./rag/routes/rag.route.js";
import notificationRoutes from "./notification/routes/notification.route.js";
import profileRoutes from "./profile/profile.route.js";

export const mainRouter = express.Router();

// /api/auth
mainRouter.use("/auth", authRoutes)

// /api/questions
mainRouter.use("/questions", questionRoutes)

// /api/answers
mainRouter.use("/answers", answerRoutes)

// /api/rag
mainRouter.use("/rag", ragRouter)


// /api/notifications
mainRouter.use("/notifications", notificationRoutes)
mainRouter.use('/profile', profileRoutes);

import discussionRoutes from './discussion/routes/discussion.route.js';
import chatRoutes from './chat/routes/chat.route.js';
mainRouter.use('/discussion', discussionRoutes);
mainRouter.use('/chat', chatRoutes);
