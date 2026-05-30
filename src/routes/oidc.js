import { Router } from "express"
import { authorizeController, tokenController, userInfoController } from "../controller/oidc.js"

const oidcRouter = Router()

oidcRouter.get("/authorize", authorizeController);
oidcRouter.post("/token", tokenController);
oidcRouter.get("/userinfo", userInfoController);

export default oidcRouter