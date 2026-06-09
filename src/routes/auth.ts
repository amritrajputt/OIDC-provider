import { Router } from "express"
import validate from "../../common/middleware/validate.middleware.js";
import { registerSchema, loginSchema } from "../dto/dto.auth.js";
import { register, login } from "../controller/auth.js";

const authRouter = new Router();

authRouter.post('/register', validate(registerSchema), register)
authRouter.post('/login', validate(loginSchema), login)

export default authRouter;