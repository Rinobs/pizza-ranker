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
