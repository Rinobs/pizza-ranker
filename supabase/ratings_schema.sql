create table if not exists public.ratings (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  product_slug text not null,
  rating float not null,
  comment text default null,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ratings_user_product_unique
  on public.ratings (user_id, product_slug);

create index if not exists ratings_product_slug_idx
  on public.ratings (product_slug);

create index if not exists ratings_updated_at_idx
  on public.ratings (updated_at desc);

create table if not exists public.user_profiles (
  user_id uuid primary key,
  username text not null,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_product_lists (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  product_slug text not null,
  list_type text not null check (list_type in ('favorites', 'want_to_try')),
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists user_product_lists_user_slug_type_unique
  on public.user_product_lists (user_id, product_slug, list_type);

create index if not exists user_product_lists_user_idx
  on public.user_product_lists (user_id);

create index if not exists user_product_lists_type_idx
  on public.user_product_lists (list_type);

create index if not exists user_profiles_username_lower_idx
  on public.user_profiles (lower(username));

create unique index if not exists user_profiles_username_lower_unique
  on public.user_profiles (lower(username));

create table if not exists public.user_follows (
  id bigint generated always as identity primary key,
  follower_user_id uuid not null,
  following_user_id uuid not null,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint user_follows_not_self check (follower_user_id <> following_user_id)
);

create unique index if not exists user_follows_unique
  on public.user_follows (follower_user_id, following_user_id);

create index if not exists user_follows_follower_idx
  on public.user_follows (follower_user_id);

create index if not exists user_follows_following_idx
  on public.user_follows (following_user_id);

