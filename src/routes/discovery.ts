import { Router } from "express";
import crypto from "crypto";
import pool from "../model/db.js";

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

discoveryRouter.get(["/jwks.json", "/.well-known/jwks.json"], async(req, res) => {
    try {
        const result = await pool.query(
            "SELECT kid, public_key FROM signing_keys WHERE status IN ('active', 'retired')"
        );
        
        const jwks = result.rows.map(row => {
            const publicKeyObj = crypto.createPublicKey (row.public_key);
            const jwk = publicKeyObj.export({ format: 'jwk' });
            return {
                kty: jwk.kty,
                use: 'sig',
                alg: 'RS256',
                kid: row.kid, 
                n: jwk.n,
                e: jwk.e
            };
        });
            
        return res.json({keys: jwks})
    } catch (error) {
        console.error("JWKS Export Error:", error);
        return res.status(500).json({ error: "Failed to export JWK" });
    }
});

export default discoveryRouter;