import { Router } from "express"
import {authorizeService} from "../service/oidc.service.js"

const oidcRouter = Router()

oidcRouter.get("/authorize",authorizeService);

export default oidcRouter