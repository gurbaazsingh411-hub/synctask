import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/contexts/SupabaseContext';
import { motion } from 'framer-motion';
import api from '@/lib/api';

interface TodoList {
  id: string;
  title: string;
  tasks: number;
  completed: number;
  steps: number;
}

interface EventDetails {
  id: string;
  name: string;
  description: string;
  members: number;
  createdAt: string;
  todoLists: TodoList[];
}

export default function EventDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, signOut } = useSupabase();
  const [activeTab, setActiveTab] = useState<'overview' | 'lists' | 'members' | 'analytics'>('overview');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  
  // State for event details
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load event details
  useEffect(() => {
    if (!id || !user) return;
    
    const fetchEvent = async () => {
      try {
        setLoading(true);
        
        // Fetch the event details
        const eventData = await api.events.getById(id as string);
        
        // Fetch to-do lists for the event
        const todoListsData = await api.todoLists.getByEvent(id as string);
        
        // Create the event object with the fetched data
        const fullEvent: EventDetails = {
          id: eventData.id,
          name: eventData.name,
          description: eventData.description || '',
          members: 0, // This would need a separate query to count members
          createdAt: eventData.created_at,
          todoLists: todoListsData.map(list => ({
            id: list.id,
            title: list.title,
            tasks: 0, // This would need a separate query to count tasks
            completed: 0, // This would need a separate query to count completed tasks
            steps: 0  // This would need a separate query to count steps
          }))
        };
        
        setEvent(fullEvent);
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [id, user]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-400">Loading event...</p>
        </div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400">Event not found</h2>
          <button 
            onClick={() => router.push('/events')}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return <div>Redirecting...</div>;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleBack = () => {
    router.push('/events');
  };

  const handleInviteMembers = () => {
    // Generate an invite link with the event ID
    const link = `${window.location.origin}/events/${id}/join`;
    setInviteLink(link);
    setShowInviteModal(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center py-6 border-b border-gray-800">
          <div className="flex items-center">
            <button 
              onClick={handleBack}
              className="mr-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">SyncTask</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Welcome, {user.email}</span>
            <button 
              onClick={handleSignOut}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="py-8">
          {/* Event Header */}
          <div className="mb-10">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg"></div>
            <div className="bg-gray-800/50 p-6 border-x border-b border-gray-700 rounded-b-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
                  <p className="text-gray-400 mb-4">{event.description}</p>
                  <div className="flex items-center text-sm text-gray-500">
                    <span>{event.members} members</span>
                    <span className="mx-2">•</span>
                    <span>Created {event.createdAt}</span>
                  </div>
                </div>
                <div className="mt-4 md:mt-0">
                  <button 
                    onClick={handleInviteMembers}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Invite Members
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-800 mb-8">
            <nav className="flex space-x-8">
              {(['overview', 'lists', 'members', 'analytics'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 px-1 font-medium text-sm ${
                    activeTab === tab
                      ? 'text-indigo-400 border-b-2 border-indigo-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold mb-4">To-Do Lists</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {event.todoLists.map((list, index) => (
                      <motion.div
                        key={list.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-semibold">{list.title}</h3>
                          <span className="bg-gray-700 text-xs px-2 py-1 rounded-full">
                            {list.steps} steps
                          </span>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{list.completed}/{list.tasks} tasks</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-indigo-500 h-2 rounded-full" 
                              style={{ width: `${(list.completed / list.tasks) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>{list.tasks} tasks</span>
                          <span>{list.completed} completed</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                    <p className="text-gray-500 text-center py-8">No recent activity yet. Start adding tasks to see updates here.</p>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'lists' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">To-Do Lists</h2>
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    + Add List
                  </button>
                </div>
                
                <div className="space-y-4">
                  {event.todoLists.map((list, index) => (
                    <motion.div
                      key={list.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 flex justify-between items-center"
                    >
                      <div>
                        <h3 className="text-lg font-semibold">{list.title}</h3>
                        <p className="text-gray-500 text-sm">{list.tasks} tasks • {list.steps} steps</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-indigo-500 h-2 rounded-full" 
                            style={{ width: `${(list.completed / list.tasks) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{Math.round((list.completed / list.tasks) * 100)}%</span>
                        <button className="text-gray-400 hover:text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'members' && (
              <div>
                <h2 className="text-xl font-bold mb-6">Event Members</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5].map((member, index) => (
                    <div key={index} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex items-center">
                      <div className="bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center mr-4">
                        <span className="font-medium">U{member}</span>
                      </div>
                      <div>
                        <div className="font-medium">User {member}</div>
                        <div className="text-sm text-gray-500">user{member}@example.com</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'analytics' && (
              <div>
                <h2 className="text-xl font-bold mb-6">Analytics</h2>
                <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                  <p className="text-gray-500 text-center py-8">Analytics will be available when multiple users contribute to this event.</p>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="py-8 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} SyncTask. Professional task management for teams.</p>
        </footer>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Invite Members</h3>
                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-400 mb-4">Share this link with others to invite them to join your event:</p>
              
              <div className="flex mb-4">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-l-lg border border-gray-600 truncate"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-r-lg transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mt-2">Anyone with this link can join the event. Be careful who you share it with.</p>
              <p className="text-sm text-gray-500 mt-1">They must have an account to join.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}