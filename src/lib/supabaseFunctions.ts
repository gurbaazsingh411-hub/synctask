import { supabase } from './supabaseClient';

export const supabaseFunctions = {
  // Events
  events: {
    async getAll() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    async getById(id: string) {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_members(count),
          todo_lists(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    async create(event: { name: string; description?: string | null }) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('events')
        .insert([{ ...event, owner_id: user.id }])
        .select()
        .single();
      if (error) throw error;

      // Add owner as a member
      const { error: memberError } = await supabase
        .from('event_members')
        .insert([{ event_id: data.id, user_id: user.id, role: 'owner' }]);
      if (memberError) console.error('Error adding owner as member:', memberError);

      return data;
    }
  },

  // To-do Lists
  lists: {
    async getByEventId(eventId: string) {
      const { data, error } = await supabase
        .from('todo_lists')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    async create(list: { event_id: string; title: string; description?: string | null }) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('todo_lists')
        .insert([{ ...list, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // To-do Steps
  steps: {
    async getByListId(listId: string) {
      const { data, error } = await supabase
        .from('todo_steps')
        .select('*')
        .eq('todo_list_id', listId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data;
    },
    async create(step: { todo_list_id: string; title: string; description?: string | null; position: number }) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('todo_steps')
        .insert([{ ...step, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // Tasks
  tasks: {
    async getByStepId(stepId: string) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('todo_step_id', stepId)
        .order('position', { ascending: true });
      if (error) throw error;
      return data;
    },
    async create(task: { todo_step_id: string; title: string; description?: string | null; position: number }) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...task, created_by: user?.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    async updateStatus(taskId: string, status: 'pending' | 'in_progress' | 'completed') {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // Stats
  stats: {
    async getUserStats() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { events: 0, tasks: 0, contributions: 0 };

      const { count: eventsCount } = await supabase
        .from('event_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .neq('status', 'completed');

      const { count: completedCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'completed');

      return {
        events: eventsCount || 0,
        tasks: tasksCount || 0,
        contributions: completedCount || 0
      };
    }
  },

  // Canvas
  canvas: {
    async getByEvent(eventId: string) {
      const { data, error } = await supabase
        .from('canvas')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async create(eventId: string, nodes: any[]) {
      const { data, error } = await supabase
        .from('canvas')
        .insert([{ event_id: eventId, nodes: { nodes, roles: [] } }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    async updateByEvent(eventId: string, nodes: any[], roles: string[]) {
      const { data, error } = await supabase
        .from('canvas')
        .update({ 
          nodes: { nodes, roles }, 
          updated_at: new Date().toISOString() 
        })
        .eq('event_id', eventId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }
};
