CREATE TABLE clients(
    id Primary key default gen_random_uuid(),
    client_id varchar(100) unique not null,
    client_secret varchar(100) not null,
    redirect_uri text not null,
    app_name varchar(100) not null,
    host text null,
    privacy_url text null,
    terms_url text null,
    created_at timestamp default now(),
    updated_at timestamp default now()
);