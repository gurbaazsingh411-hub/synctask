import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/contexts/SupabaseContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

export default function EventDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, signOut } = useSupabase();
  const [event, setEvent] = useState<any>(null);
  const [todoLists, setTodoLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !user) return;

    const fetchEventData = async () => {
      try {
        setLoading(true);
        const eventData = await api.events.getById(id as string);
        setEvent(eventData);
        
        const listsData = await api.lists.getByEventId(id as string);
        setTodoLists(listsData);
      } catch (err: any) {
        console.error('Error fetching event data:', err);
        setError(err.message || 'Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id, user]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!user) {
    router.push('/auth/login');
    return <div>Redirecting...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-4">Loading event details...</span>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-gray-400 text-center max-w-md">{error || 'Event not found'}</p>
        <button 
          onClick={() => router.push('/events')}
          className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center py-6 border-b border-gray-800">
          <div className="flex items-center space-x-4">
            <button onClick={() => router.push('/events')} className="text-gray-400 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">SyncTask</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 hidden sm:inline">Welcome, {user.email}</span>
            <button 
              onClick={handleSignOut}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="py-12">
          {/* Event Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold mb-3">{event.name}</h1>
                <p className="text-xl text-gray-400 max-w-2xl">{event.description || 'No description provided.'}</p>
              </div>
              <div className="flex gap-3">
                <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Invite
                </button>
                <button 
                  onClick={() => router.push(`/events/${id}/canvas`)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl transition-all flex items-center text-sm font-semibold shadow-lg shadow-indigo-500/25 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Open Visual Canvas
                </button>
              </div>
            </div>
            
            <div className="mt-8 flex items-center text-sm text-gray-500 space-x-6">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Created {new Date(event.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {event.event_members?.[0]?.count || 0} Collaborators
              </div>
            </div>
          </motion.div>

          {/* To-do Lists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {todoLists.map((list, index) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm hover:border-indigo-500/50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-indigo-300 group-hover:text-white transition-colors">{list.title}</h3>
                    <button className="text-gray-500 hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Placeholder for Steps - In a full implementation, we'd fetch and map steps here */}
                  <div className="space-y-4">
                     <p className="text-sm text-gray-500 italic">No steps added to this list yet.</p>
                     <button className="w-full py-2 border border-dashed border-gray-700 rounded-xl text-xs text-gray-500 hover:border-indigo-500/50 hover:text-indigo-400 transition-all flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Step
                     </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Create First List Card */}
            {todoLists.length === 0 && (
              <div className="col-span-full py-20 bg-gray-800/20 border-2 border-dashed border-gray-800 rounded-3xl text-center">
                <div className="mx-auto w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-indigo-400 border border-white/5 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Initialize your workspace</h3>
                <p className="text-gray-500 mb-8 max-w-xs mx-auto">The Visual Canvas is the primary place where you orchestrate tasks and collaborate in real-time.</p>
                <button 
                  onClick={() => router.push(`/events/${id}/canvas`)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-10 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                >
                  Open Visual Canvas
                </button>
              </div>
            )}
          </div>
        </main>

        <footer className="py-8 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} SyncTask. Professional task management for teams.</p>
        </footer>
      </div>
    </div>
  );
}
