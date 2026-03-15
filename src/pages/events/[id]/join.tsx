import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/contexts/SupabaseContext';
import { motion } from 'framer-motion';
import api from '@/lib/api';

export default function JoinEventPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, signOut } = useSupabase();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !user) return;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const eventData = await api.events.getById(id as string);
        setEvent(eventData);
      } catch (err: any) {
        console.error('Error fetching event for join:', err);
        setError('Could not find the event you are trying to join.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, user]);

  const handleJoin = async () => {
    if (!id || !user) return;
    
    try {
      setJoining(true);
      // In a real implementation, we might need a specific 'join' API call
      // For now, we'll use a placeholder logic or assume the user is added upon visiting if they have the link
      // But let's assume we need to call an endpoint or just redirect if they are already considered members
      
      // Navigate to the event dashboard
      router.push(`/events/${id}`);
    } catch (err: any) {
      console.error('Error joining event:', err);
      setError('Failed to join the event. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  if (!user) {
    router.push({
      pathname: '/auth/login',
      query: { returnTo: router.asPath }
    });
    return <div>Redirecting...</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-4">Checking invitation...</span>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Invalid Invitation</h1>
        <p className="text-gray-400 text-center max-w-md">{error}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-gray-800/50 border border-gray-700 rounded-2xl p-8 backdrop-blur-sm text-center shadow-2xl"
      >
        <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">You're Invited!</h1>
        <p className="text-gray-400 mb-8">
          You've been invited to collaborate on <span className="text-white font-semibold font-bold">{event.name}</span>
        </p>

        <div className="space-y-4">
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Accept Invitation & Join'}
          </button>
          <button
            onClick={() => router.push('/events')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </motion.div>
    </div>
  );
}
