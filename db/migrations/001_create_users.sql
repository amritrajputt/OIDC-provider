CREATE TABLE users(
    id UUID Primary key default gen_random_uuid(),
    email varchar(100) unique not null,
    name varchar(50) min_length(3) not null,
    password varchar(72) min_length(8) not null,
    created_at timestamp default now(),
    updated_at timestamp default now()
);