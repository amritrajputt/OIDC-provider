CREATE TABLE signing_keys (
    kid VARCHAR(255) PRIMARY KEY,
    private_key TEXT NOT NULL,
    public_key TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
