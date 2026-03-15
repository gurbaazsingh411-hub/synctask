-- Supabase Database Schema for SyncTask

-- Users table (profiles)
-- This table stores additional user information and is synced with Supabase Auth
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Events table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event members table (for collaboration)
CREATE TABLE event_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- To-do lists table
CREATE TABLE todo_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- To-do steps table (nested structure)
CREATE TABLE todo_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_list_id UUID REFERENCES todo_lists(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  position INTEGER DEFAULT 0, -- for ordering steps within a list
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table (individual tasks within steps)
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_step_id UUID REFERENCES todo_steps(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  assigned_to UUID REFERENCES auth.users(id),
  position INTEGER DEFAULT 0, -- for ordering tasks within a step
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table (for discussions)
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  todo_list_id UUID REFERENCES todo_lists(id) ON DELETE CASCADE,
  todo_step_id UUID REFERENCES todo_steps(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attachments table (for file uploads)
CREATE TABLE attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  todo_list_id UUID REFERENCES todo_lists(id) ON DELETE CASCADE,
  todo_step_id UUID REFERENCES todo_steps(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics snapshots table (for tracking metrics)
CREATE TABLE analytics_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  metric_type VARCHAR(50) NOT NULL, -- 'tasks_completed', 'contribution_percentage', etc.
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Canvas table (for workspace nodes)
CREATE TABLE canvas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  nodes JSONB DEFAULT '{"nodes": [], "roles": []}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id)
);

-- 1. Create security functions to break recursion and handle visibility
-- This function checks membership without querying the 'events' table
CREATE OR REPLACE FUNCTION public.is_event_member(event_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.event_members 
    WHERE event_id = event_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This function checks general access (owner or member)
CREATE OR REPLACE FUNCTION public.can_access_event(event_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_uuid AND owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.event_members WHERE event_id = event_uuid AND user_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas ENABLE ROW LEVEL SECURITY;

-- 2. Apply new, clean policies
-- Drop existing policies first to ensure idempotency
DROP POLICY IF EXISTS "events_access_policy" ON events;
DROP POLICY IF EXISTS "members_access_policy" ON event_members;
DROP POLICY IF EXISTS "lists_access_policy" ON todo_lists;
DROP POLICY IF EXISTS "steps_access_policy" ON todo_steps;
DROP POLICY IF EXISTS "tasks_access_policy" ON tasks;
DROP POLICY IF EXISTS "comments_access_policy" ON comments;
DROP POLICY IF EXISTS "attachments_access_policy" ON attachments;
DROP POLICY IF EXISTS "analytics_access_policy" ON analytics_snapshots;
DROP POLICY IF EXISTS "canvas_access_policy" ON canvas;

-- Events Table: Direct owner_id check is CRITICAL for INSERT visibility
CREATE POLICY "events_access_policy" ON events
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR is_event_member(id))
  WITH CHECK (owner_id = auth.uid());

-- Event Members
CREATE POLICY "members_access_policy" ON event_members
  FOR ALL TO authenticated
  USING (can_access_event(event_id));

-- To-Do Lists
CREATE POLICY "lists_access_policy" ON todo_lists
  FOR ALL TO authenticated
  USING (can_access_event(event_id));

-- To-Do Steps
CREATE POLICY "steps_access_policy" ON todo_steps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM todo_lists 
      WHERE id = todo_list_id AND can_access_event(event_id)
    )
  );

-- Tasks
CREATE POLICY "tasks_access_policy" ON tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM todo_steps s 
      JOIN todo_lists l ON s.todo_list_id = l.id 
      WHERE s.id = todo_step_id AND can_access_event(l.event_id)
    )
  );

-- Comments & Attachments
CREATE POLICY "comments_access_policy" ON comments
  FOR ALL TO authenticated
  USING (can_access_event(event_id));

CREATE POLICY "attachments_access_policy" ON attachments
  FOR ALL TO authenticated
  USING (can_access_event(event_id));

CREATE POLICY "analytics_access_policy" ON analytics_snapshots
  FOR ALL TO authenticated
  USING (can_access_event(event_id));

CREATE POLICY "canvas_access_policy" ON canvas
  FOR ALL TO authenticated
  USING (can_access_event(event_id));

-- Profiles visibility: Users can see profiles of people they share an event with
CREATE POLICY "profiles_visibility_policy" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM event_members em1
      JOIN event_members em2 ON em1.event_id = em2.event_id
      WHERE em1.user_id = auth.uid() AND em2.user_id = profiles.id
    )
  );

-- Profiles update: Users can only update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());