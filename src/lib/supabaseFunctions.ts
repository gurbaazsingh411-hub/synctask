import { supabase } from './supabaseClient';


// Type definitions for the database tables
type Event = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

type EventMember = {
  id: string;
  event_id: string;
  user_id: string;
  role: string;
  joined_at: string;
};

type TodoList = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type TodoStep = {
  id: string;
  todo_list_id: string;
  title: string;
  description: string | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Task = {
  id: string;
  todo_step_id: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Comment = {
  id: string;
  event_id: string;
  todo_list_id: string | null;
  todo_step_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type Attachment = {
  id: string;
  event_id: string;
  todo_list_id: string | null;
  todo_step_id: string | null;
  task_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
};

// Events Functions
export const eventFunctions = {
  // Create a new event
  createEvent: async (eventData: Omit<Event, 'id' | 'owner_id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Start a transaction to ensure both the event and member record are created
    const { data, error } = await supabase
      .from('events')
      .insert([{ 
        ...eventData, 
        owner_id: user.id 
      }])
      .select()
      .single();

    if (error) throw error;
    
    // Add the user as a member of the event to ensure they can access it
    const event = data as Event;
    
    const { error: memberError } = await supabase
      .from('event_members')
      .insert([{ 
        event_id: event.id, 
        user_id: user.id 
      }]);
    
    if (memberError) {
      console.error('Error adding user as event member:', memberError);
      // Don't throw the error, as the event was created successfully
      // The user can still access the event as the owner
    }
    
    return event;
  },

  // Get events for a user
  getUserEvents: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // With corrected RLS policies, a simple select from events will
    // automatically return all events the user owns OR is a member of.
    const { data, error } = await supabase
      .from('events')
      .select('id, name, description, owner_id, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error in getUserEvents:', error);
      throw error;
    }
    
    return data as Event[];
  },

  // Get a specific event
  getEventById: async (eventId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        id, 
        name, 
        description, 
        owner_id, 
        created_at, 
        updated_at
      `)
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data as Event;
  },

  // Update an event
  updateEvent: async (eventId: string, eventData: Partial<Omit<Event, 'id' | 'owner_id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('events')
      .update(eventData)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data as Event;
  },

  // Delete an event
  deleteEvent: async (eventId: string) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  },

  // Add a member to an event
  addMemberToEvent: async (eventId: string, userId: string) => {
    // Check if the user is already a member to avoid duplicate key violations
    const { data: existingMember, error: checkError } = await supabase
      .from('event_members')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();
      
    if (!checkError && existingMember) {
      // User is already a member, return the existing record
      return existingMember as EventMember;
    }
    
    const { data, error } = await supabase
      .from('event_members')
      .insert([{ 
        event_id: eventId, 
        user_id: userId 
      }])
      .select()
      .single();

    if (error) {
      // If the error is due to duplicate key violation, return existing record
      if (error.code === '23505') { // Unique violation error code
        const { data: existingRecord } = await supabase
          .from('event_members')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .single();
        
        return existingRecord as EventMember;
      }
      throw error;
    }
    return data as EventMember;
  }
};

// To-Do Lists Functions
export const todoListFunctions = {
  // Create a new to-do list
  createTodoList: async (listData: Omit<TodoList, 'id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('todo_lists')
      .insert([{ 
        ...listData, 
        created_by: user.id 
      }])
      .select()
      .single();

    if (error) throw error;
    return data as TodoList;
  },

  // Get to-do lists for an event
  getTodoListsForEvent: async (eventId: string) => {
    const { data, error } = await supabase
      .from('todo_lists')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data as TodoList[];
  },

  // Update a to-do list
  updateTodoList: async (listId: string, listData: Partial<Omit<TodoList, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('todo_lists')
      .update(listData)
      .eq('id', listId)
      .select()
      .single();

    if (error) throw error;
    return data as TodoList;
  },

  // Delete a to-do list
  deleteTodoList: async (listId: string) => {
    const { error } = await supabase
      .from('todo_lists')
      .delete()
      .eq('id', listId);

    if (error) throw error;
  }
};

// To-Do Steps Functions
export const todoStepFunctions = {
  // Create a new to-do step
  createTodoStep: async (stepData: Omit<TodoStep, 'id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('todo_steps')
      .insert([{ 
        ...stepData, 
        created_by: user.id 
      }])
      .select()
      .single();

    if (error) throw error;
    return data as TodoStep;
  },

  // Get steps for a to-do list
  getStepsForList: async (listId: string) => {
    const { data, error } = await supabase
      .from('todo_steps')
      .select('*')
      .eq('todo_list_id', listId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data as TodoStep[];
  },

  // Update a to-do step
  updateTodoStep: async (stepId: string, stepData: Partial<Omit<TodoStep, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('todo_steps')
      .update(stepData)
      .eq('id', stepId)
      .select()
      .single();

    if (error) throw error;
    return data as TodoStep;
  },

  // Delete a to-do step
  deleteTodoStep: async (stepId: string) => {
    const { error } = await supabase
      .from('todo_steps')
      .delete()
      .eq('id', stepId);

    if (error) throw error;
  }
};

// Tasks Functions
export const taskFunctions = {
  // Create a new task
  createTask: async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        ...taskData, 
        created_by: user.id 
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  // Get tasks for a step
  getTasksForStep: async (stepId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('todo_step_id', stepId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data as Task[];
  },

  // Update a task
  updateTask: async (taskId: string, taskData: Partial<Omit<Task, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(taskData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  // Update task status
  updateTaskStatus: async (taskId: string, status: 'pending' | 'in_progress' | 'completed') => {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  // Delete a task
  deleteTask: async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  }
};

// Comments Functions
export const commentFunctions = {
  // Create a new comment
  createComment: async (commentData: Omit<Comment, 'id' | 'created_at' | 'updated_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert([{ 
        ...commentData, 
        author_id: user.id 
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Comment;
  },

  // Get comments for an event
  getCommentsForEvent: async (eventId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        author_id,
        users!author_id (email)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get comments for a to-do list
  getCommentsForList: async (listId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        author_id,
        users!author_id (email)
      `)
      .eq('todo_list_id', listId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get comments for a step
  getCommentsForStep: async (stepId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        author_id,
        users!author_id (email)
      `)
      .eq('todo_step_id', stepId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Update a comment
  updateComment: async (commentId: string, content: string) => {
    const { data, error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select()
      .single();

    if (error) throw error;
    return data as Comment;
  },

  // Delete a comment
  deleteComment: async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
  }
};

// Attachments Functions
export const attachmentFunctions = {
  // Upload a file to storage and create attachment record
  uploadAttachment: async (
    file: File, 
    eventId: string, 
    listId?: string, 
    stepId?: string, 
    taskId?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate unique file name
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    
    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Create attachment record in database
    const { data, error } = await supabase
      .from('attachments')
      .insert([{
        event_id: eventId,
        todo_list_id: listId || null,
        todo_step_id: stepId || null,
        task_id: taskId || null,
        file_name: file.name,
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id
      }])
      .select()
      .single();

    if (error) {
      // If DB insertion fails, try to delete the uploaded file
      await supabase.storage.from('attachments').remove([fileName]);
      throw error;
    }

    return data as Attachment;
  },

  // Get attachments for an event
  getAttachmentsForEvent: async (eventId: string) => {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('event_id', eventId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data as Attachment[];
  },

  // Get attachments for a to-do list
  getAttachmentsForList: async (listId: string) => {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('todo_list_id', listId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data as Attachment[];
  },

  // Get attachments for a step
  getAttachmentsForStep: async (stepId: string) => {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('todo_step_id', stepId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data as Attachment[];
  },

  // Get attachments for a task
  getAttachmentsForTask: async (taskId: string) => {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data as Attachment[];
  },

  // Delete an attachment (removes both file and record)
  deleteAttachment: async (attachmentId: string, filePath: string) => {
    // Delete file from storage
    const { error: storageError } = await supabase
      .storage
      .from('attachments')
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Continue to delete the record anyway
    }

    // Delete record from database
    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) throw error;
  },

  // Generate public URL for an attachment
  getAttachmentUrl: (filePath: string) => {
    const { data } = supabase
      .storage
      .from('attachments')
      .getPublicUrl(filePath);
    
    return data?.publicUrl;
  }
};

// Combined functions object for convenience
export const supabaseFunctions = {
  events: eventFunctions,
  todoLists: todoListFunctions,
  todoSteps: todoStepFunctions,
  tasks: taskFunctions,
  comments: commentFunctions,
  attachments: attachmentFunctions
};