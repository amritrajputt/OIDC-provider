import { Router } from "express";
import { Jwt } from "../utils/utils.jwt.js";

const discoveryRouter = Router();

discoveryRouter.get("/.well-known/openid-configuration", (req, res) => {
    const issuer = process.env.ISSUER_URL || "http://localhost:3000";
    res.json({
        "issuer": issuer,
        "authorization_endpoint": `${issuer}/api/oidc/authorize`,
        "token_endpoint": `${issuer}/api/oidc/token`,
        "userinfo_endpoint": `${issuer}/api/oidc/userinfo`,
        "introspection_endpoint": `${issuer}/api/oidc/introspect`,
        "jwks_uri": `${issuer}/jwks.json`,
        "response_types_supported": ["code"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256"],
    });
});

discoveryRouter.get(["/jwks.json", "/.well-known/jwks.json"], (req, res) => {
    try {
        const jwk = Jwt.publicKey.export({ format: 'jwk' });
        
        return res.json({
            keys: [
                {
                    kty: jwk.kty,
                    use: 'sig',
                    alg: 'RS256',
                    n: jwk.n,
                    e: jwk.e
                }
            ]
        });
    } catch (error) {
        console.error("JWKS Export Error:", error);
        return res.status(500).json({ error: "Failed to export JWK" });
    }
});

export default discoveryRouter;