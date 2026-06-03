import { Router } from "express"
import { authorizeController, tokenController, userInfoController, tokenIntrospectionController, refreshTokenController } from "../controller/oidc.js"

const oidcRouter = Router()

oidcRouter.get("/authorize", authorizeController);
oidcRouter.post("/token", tokenController);
oidcRouter.get("/userinfo", userInfoController);
oidcRouter.post("/introspect", tokenIntrospectionController);
oidcRouter.post("/refresh", refreshTokenController);

export default oidcRouter