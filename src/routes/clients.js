import { Router } from "express"
import validate from "../../common/middleware/validate.middleware.js";
import { registerClient } from "../controllers/client.controller.js";

const clientRouter = Router()

clientRouter.post('/register',validate(clientValidation),registerClient);


export default clientRouter