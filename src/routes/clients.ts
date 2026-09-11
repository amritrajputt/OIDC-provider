import { Router } from "express"
import { clientController } from "../controller/clients.controller.js";
import { authRateLimiter } from "../../common/middleware/rateLimitter.middleware.js";

const clientRouter = Router()

clientRouter.post('/register', authRateLimiter, clientController);

export default clientRouter