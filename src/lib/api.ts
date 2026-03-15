import { supabaseFunctions } from './supabaseFunctions';

const api = {
  events: supabaseFunctions.events,
  lists: supabaseFunctions.lists,
  steps: supabaseFunctions.steps,
  tasks: supabaseFunctions.tasks,
  stats: supabaseFunctions.stats,
  canvas: supabaseFunctions.canvas,
};

export default api;
