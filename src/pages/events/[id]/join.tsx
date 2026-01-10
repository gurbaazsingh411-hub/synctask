import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/contexts/SupabaseContext';
import api from '@/lib/api';

export default function JoinEventPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, signOut } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id || !user) return;

    const joinEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if the event exists
        const event = await api.events.getById(id as string);
        
        // Add the user as a member of the event
        try {
          await api.events.addMember(id as string, user.id);
        } catch (addMemberError: any) {
          // If user is already a member, that's fine - just continue
          if (addMemberError.code !== '23505' && !addMemberError.message.includes('duplicate')) {
            throw addMemberError;
          }
        }
        
        setSuccess(true);
        
        // Redirect to the event page after a short delay
        setTimeout(() => {
          router.push(`/events/${id}`);
        }, 2000);
      } catch (err: any) {
        console.error('Error joining event:', err);
        setError(err.message || 'Failed to join event');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      joinEvent();
    }
  }, [id, user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading && !success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-400">Joining event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center py-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold">SyncTask</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Welcome, {user?.email}</span>
            <button 
              onClick={handleSignOut}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="py-12 max-w-2xl mx-auto">
          {error ? (
            <div className="bg-red-900/30 border border-red-700 text-red-200 p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-2">Error Joining Event</h2>
              <p>{error}</p>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/events')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Back to Events
                </button>
              </div>
            </div>
          ) : success ? (
            <div className="bg-green-900/30 border border-green-700 text-green-200 p-6 rounded-xl text-center">
              <h2 className="text-2xl font-bold mb-2">Success!</h2>
              <p>You've successfully joined the event.</p>
              <p className="mt-2">Redirecting to the event page...</p>
            </div>
          ) : null}
        </main>

        <footer className="py-8 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} SyncTask. Professional task management for teams.</p>
        </footer>
      </div>
    </div>
  );
}