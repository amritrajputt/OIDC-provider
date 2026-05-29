CREATE TABLE users(
    id UUID Primary key default gen_random_uuid(),
    email varchar(100) unique not null,
    name varchar(50)  not null,
    password varchar(72) not null,
    created_at timestamp default now(),
    updated_at timestamp default now()
);