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

alter table if exists public.user_profiles
  add column if not exists bio text;

alter table if exists public.user_profiles
  add column if not exists avatar_url text;

create table if not exists public.user_product_lists (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  product_slug text not null,
  list_type text not null check (list_type in ('favorites', 'want_to_try', 'tried')),
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.user_product_lists
  drop constraint if exists user_product_lists_list_type_check;

alter table if exists public.user_product_lists
  add constraint user_product_lists_list_type_check
  check (list_type in ('favorites', 'want_to_try', 'tried'));

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

create table if not exists public.user_custom_lists (
  id uuid primary key,
  user_id uuid not null,
  name text not null,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint user_custom_lists_name_length
    check (char_length(trim(name)) between 2 and 40)
);

create unique index if not exists user_custom_lists_user_name_lower_unique
  on public.user_custom_lists (user_id, lower(name));

create index if not exists user_custom_lists_user_idx
  on public.user_custom_lists (user_id);

create index if not exists user_custom_lists_updated_at_idx
  on public.user_custom_lists (updated_at desc);

create table if not exists public.user_custom_list_items (
  id bigint generated always as identity primary key,
  list_id uuid not null references public.user_custom_lists (id) on delete cascade,
  product_slug text not null,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists user_custom_list_items_list_product_unique
  on public.user_custom_list_items (list_id, product_slug);

create index if not exists user_custom_list_items_list_idx
  on public.user_custom_list_items (list_id);

create index if not exists user_custom_list_items_product_idx
  on public.user_custom_list_items (product_slug);

create index if not exists user_custom_list_items_updated_at_idx
  on public.user_custom_list_items (updated_at desc);

create table if not exists public.review_likes (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  review_user_id uuid not null,
  product_slug text not null,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint review_likes_not_self check (user_id <> review_user_id)
);

create unique index if not exists review_likes_user_review_product_unique
  on public.review_likes (user_id, review_user_id, product_slug);

create index if not exists review_likes_review_product_idx
  on public.review_likes (review_user_id, product_slug);

create index if not exists review_likes_user_idx
  on public.review_likes (user_id);

create index if not exists review_likes_product_idx
  on public.review_likes (product_slug);

create table if not exists public.review_replies (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  review_user_id uuid not null,
  product_slug text not null,
  text text not null,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint review_replies_not_self check (user_id <> review_user_id),
  constraint review_replies_text_length
    check (char_length(trim(text)) between 1 and 1000)
);

create index if not exists review_replies_review_product_idx
  on public.review_replies (review_user_id, product_slug);

create index if not exists review_replies_user_idx
  on public.review_replies (user_id);

create index if not exists review_replies_product_updated_at_idx
  on public.review_replies (product_slug, updated_at desc);

create table if not exists public.product_submissions (
  id uuid primary key,
  user_id uuid,
  contact_email text,
  product_name text not null,
  brand text,
  category text not null,
  barcode text,
  product_url text,
  image_url text,
  notes text,
  status text not null default 'open',
  inserted_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint product_submissions_status_check
    check (status in ('open', 'approved', 'rejected')),
  constraint product_submissions_name_length
    check (char_length(trim(product_name)) between 2 and 120),
  constraint product_submissions_category_length
    check (char_length(trim(category)) between 2 and 60)
);

create index if not exists product_submissions_status_idx
  on public.product_submissions (status);

create index if not exists product_submissions_user_idx
  on public.product_submissions (user_id);

create index if not exists product_submissions_inserted_at_idx
  on public.product_submissions (inserted_at desc);
