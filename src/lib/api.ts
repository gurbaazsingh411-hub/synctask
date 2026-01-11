import { supabaseFunctions } from './supabaseFunctions';

// Export all functions as a unified API
export const api = {
  events: {
    create: supabaseFunctions.events.createEvent,
    getAll: supabaseFunctions.events.getUserEvents,
    getById: supabaseFunctions.events.getEventById,
    update: supabaseFunctions.events.updateEvent,
    delete: supabaseFunctions.events.deleteEvent,
    addMember: supabaseFunctions.events.addMemberToEvent,
    getMembers: supabaseFunctions.events.getEventMembers,
  },
  todoLists: {
    create: supabaseFunctions.todoLists.createTodoList,
    getByEvent: supabaseFunctions.todoLists.getTodoListsForEvent,
    update: supabaseFunctions.todoLists.updateTodoList,
    delete: supabaseFunctions.todoLists.deleteTodoList,
  },
  todoSteps: {
    create: supabaseFunctions.todoSteps.createTodoStep,
    getByList: supabaseFunctions.todoSteps.getStepsForList,
    update: supabaseFunctions.todoSteps.updateTodoStep,
    delete: supabaseFunctions.todoSteps.deleteTodoStep,
  },
  tasks: {
    create: supabaseFunctions.tasks.createTask,
    getByStep: supabaseFunctions.tasks.getTasksForStep,
    update: supabaseFunctions.tasks.updateTask,
    updateStatus: supabaseFunctions.tasks.updateTaskStatus,
    delete: supabaseFunctions.tasks.deleteTask,
  },
  comments: {
    create: supabaseFunctions.comments.createComment,
    getByEvent: supabaseFunctions.comments.getCommentsForEvent,
    getByList: supabaseFunctions.comments.getCommentsForList,
    getByStep: supabaseFunctions.comments.getCommentsForStep,
    update: supabaseFunctions.comments.updateComment,
    delete: supabaseFunctions.comments.deleteComment,
  },
  attachments: {
    upload: supabaseFunctions.attachments.uploadAttachment,
    getByEvent: supabaseFunctions.attachments.getAttachmentsForEvent,
    getByList: supabaseFunctions.attachments.getAttachmentsForList,
    getByStep: supabaseFunctions.attachments.getAttachmentsForStep,
    getByTask: supabaseFunctions.attachments.getAttachmentsForTask,
    delete: supabaseFunctions.attachments.deleteAttachment,
    getUrl: supabaseFunctions.attachments.getAttachmentUrl,
  },
  canvas: {
    getByEvent: supabaseFunctions.canvas.getCanvasByEvent,
    create: supabaseFunctions.canvas.createCanvas,
    update: supabaseFunctions.canvas.updateCanvas,
    updateByEvent: supabaseFunctions.canvas.updateCanvasByEvent,
  }
};

// Note: Types are defined in supabaseFunctions.ts and available through the functions
// No need to re-export types here as they're implicitly available through the functions

export default api;