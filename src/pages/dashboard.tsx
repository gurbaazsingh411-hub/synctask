import { useRouter } from 'next/router';
import { useSupabase } from '@/contexts/SupabaseContext';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const router = useRouter();
  const { user, signOut } = useSupabase();

  if (!user) {
    router.push('/auth/login');
    return <div>Redirecting...</div>;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center py-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold">SyncTask</h1>
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

        <main className="py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl font-bold mb-6">
              Welcome to <span className="text-indigo-400">SyncTask</span>
            </h1>
            <p className="text-xl text-gray-300 mb-10">
              Your collaborative task management platform is ready. Create your first event to get started.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => router.push('/events')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
              >
                View My Events
              </button>
              <button 
                onClick={() => router.push('/events/create')}
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
              >
                Create New Event
              </button>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <div className="mt-20 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">Your Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0 }}
                className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
              >
                <h3 className="text-lg font-semibold text-gray-400 mb-2">Events</h3>
                <p className="text-3xl font-bold text-white mb-2">0</p>
                <p className="text-sm text-gray-500">Active events you're part of</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
              >
                <h3 className="text-lg font-semibold text-gray-400 mb-2">Tasks</h3>
                <p className="text-3xl font-bold text-white mb-2">0</p>
                <p className="text-sm text-gray-500">Tasks assigned to you</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-800/50 p-6 rounded-xl border border-gray-700"
              >
                <h3 className="text-lg font-semibold text-gray-400 mb-2">Contributions</h3>
                <p className="text-3xl font-bold text-white mb-2">0</p>
                <p className="text-sm text-gray-500">Tasks completed this week</p>
              </motion.div>
            </div>
          </div>
        </main>

        <footer className="py-8 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} SyncTask. Professional task management for teams.</p>
        </footer>
      </div>
    </div>
  );
}