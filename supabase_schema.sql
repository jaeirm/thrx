-- Create a table for chats
create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text,
  user_id uuid references auth.users(id)
);

-- Create a table for messages
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  chat_id uuid references public.chats(id) on delete cascade not null,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  model text, -- Store which model generated this
  attachments jsonb[] -- Array of file metadata
);

-- Enable Row Level Security (RLS)
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Create policies (assuming authenticated access, or public if anon is allowed)
-- For this demo, we might allow public access if no auth is implemented yet, 
-- but best practice is to restrict to auth.uid()
create policy "Users can view their own chats" on public.chats
  for select using (auth.uid() = user_id);

create policy "Users can insert their own chats" on public.chats
  for insert with check (auth.uid() = user_id);

create policy "Users can view messages of their chats" on public.messages
  for select using (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
      and chats.user_id = auth.uid()
    )
  );

create policy "Users can insert messages to their chats" on public.messages
  for insert with check (
    exists (
      select 1 from public.chats
      where chats.id = messages.chat_id
      and chats.user_id = auth.uid()
    )
  );

-- Create storage bucket for attachments
insert into storage.buckets (id, name, public) 
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "Public Access to Attachments" on storage.objects
  for select using ( bucket_id = 'attachments' );

create policy "Authenticated users can upload attachments" on storage.objects
  for insert with check ( bucket_id = 'attachments' and auth.role() = 'authenticated' );

-- NOTE: If using anon key for demo without auth, you might need:
create policy "Anyone can upload attachments" on storage.objects
  for insert with check ( bucket_id = 'attachments' );
