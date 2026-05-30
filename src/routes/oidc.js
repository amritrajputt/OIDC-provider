import { Router } from "express"
import { authorizeService, tokenService } from "../service/oidc.service.js"

const oidcRouter = Router()

oidcRouter.get("/authorize",authorizeService);
oidcRouter.post("/token",tokenService);

export default oidcRouter