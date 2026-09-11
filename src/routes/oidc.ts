import { Router } from "express"
import { 
    authorizeController, 
    consentController,
    tokenController, 
    userInfoController, 
    revokeController,
    tokenIntrospectionController 
} from "../controller/oidc.controller.js"
import { authRateLimiter } from "../../common/middleware/rateLimitter.middleware.js";

const oidcRouter = Router()

oidcRouter.get("/authorize", authRateLimiter, authorizeController);
oidcRouter.post("/consent", authRateLimiter, consentController);
oidcRouter.post("/token", authRateLimiter, tokenController);
oidcRouter.get("/userinfo", userInfoController);
oidcRouter.post("/introspect", tokenIntrospectionController);
oidcRouter.post("/revoke", revokeController);

export default oidcRouter