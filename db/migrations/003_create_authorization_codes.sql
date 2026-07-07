CREATE TABLE autorization_codes(
    id UUID Primary key default gen_random_uuid(),
    code varchar(255) unique not null,
    user_id uuid not null REFERENCES users(id),
    client_id uuid not null REFERENCES clients(id),
    expires_at timestamp not null default NOW() + INTERVAL '2 minutes',
    is_used boolean default false,
    code_challenge VARCHAR(255) NULL,        
    code_challenge_method VARCHAR(50) NULL,  
    created_at timestamp default now(),
    updated_at timestamp default now()
);
