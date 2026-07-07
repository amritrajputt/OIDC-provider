import { Router } from "express"
import { authorizeController, tokenController, userInfoController, revokeController,tokenIntrospectionController } from "../controller/oidc.controller.js"

const oidcRouter = Router()

oidcRouter.get("/authorize", authorizeController);
oidcRouter.post("/token", tokenController);
oidcRouter.get("/userinfo", userInfoController);
oidcRouter.post("/introspect", tokenIntrospectionController);
oidcRouter.post("/revoke", revokeController);


export default oidcRouter