import { supabaseFunctions } from './supabaseFunctions';

const api = {
  events: {
    getAll: supabaseFunctions.events.getAll,
    getById: supabaseFunctions.events.getById,
    getMembers: supabaseFunctions.events.getMembers,
    create: supabaseFunctions.events.create,
  },
  lists: supabaseFunctions.lists,
  steps: supabaseFunctions.steps,
  tasks: supabaseFunctions.tasks,
  stats: supabaseFunctions.stats,
  canvas: supabaseFunctions.canvas,
};

export default api;
