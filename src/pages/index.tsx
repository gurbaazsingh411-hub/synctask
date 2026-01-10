import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Navigation */}
        <nav className="flex justify-between items-center py-6">
          <div className="text-2xl font-bold">SyncTask</div>
          <div className="flex space-x-6">
            <Link href="#features" className="hover:text-indigo-400 transition-colors">
              Features
            </Link>
            <Link href="#demo" className="hover:text-indigo-400 transition-colors">
              Demo
            </Link>
            <Link href="/auth/login" className="hover:text-indigo-400 transition-colors">
              Login
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="py-20 text-center max-w-3xl mx-auto"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Collaborate on <span className="text-indigo-400">Tasks</span> Effortlessly
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            SyncTask is a collaborative event-based to-do management platform where teams can create events, 
            invite collaborators, and manage complex multi-layered to-do lists together.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/auth/signup"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
            >
              Create Your First Event
            </Link>
            <Link 
              href="#features"
              className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
        </motion.section>

        {/* Feature Highlights */}
        <section id="features" className="py-20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Collaborative Events",
                description: "Create events and invite team members via unique links. Everyone stays synced in real-time."
              },
              {
                title: "Multi-layered Lists",
                description: "Organize tasks in nested to-do lists with steps and subtasks for complex projects."
              },
              {
                title: "Analytics & Insights",
                description: "Track contributions and task velocity with detailed analytics and visualizations."
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="bg-gray-800/50 p-8 rounded-xl border border-gray-700 hover:border-indigo-500 transition-colors"
              >
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Collaboration Demo */}
        <section id="demo" className="py-20 text-center">
          <h2 className="text-3xl font-bold mb-12">Designed for Team Collaboration</h2>
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-12 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="flex-1 text-left">
                <h3 className="text-2xl font-bold mb-4">Work Together, Stay Organized</h3>
                <ul className="space-y-3 text-left text-gray-300">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Real-time updates across all devices</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Invite team members with simple links</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Track individual contributions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Professional, distraction-free UI</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-left">
                <h4 className="font-bold mb-3 text-indigo-300">Sample Event Structure:</h4>
                <div className="space-y-2 text-sm">
                  <div className="ml-4 border-l-2 border-gray-600 pl-3 py-1">
                    <span className="font-medium">Event: Hackathon Project</span>
                  </div>
                  <div className="ml-8 border-l-2 border-gray-600 pl-3 py-1">
                    <span>To-Do List: Frontend</span>
                  </div>
                  <div className="ml-12 border-l-2 border-gray-600 pl-3 py-1">
                    <span>Step: Design Implementation</span>
                  </div>
                  <div className="ml-16 pl-3 py-1 text-gray-400">
                    <span>• Create header component</span>
                  </div>
                  <div className="ml-16 pl-3 py-1 text-gray-400">
                    <span>• Implement responsive layout</span>
                  </div>
                  <div className="ml-8 border-l-2 border-gray-600 pl-3 py-1">
                    <span>To-Do List: Backend</span>
                  </div>
                  <div className="ml-12 border-l-2 border-gray-600 pl-3 py-1">
                    <span>Step: API Development</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-700/50 rounded-xl p-12"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Join thousands of teams organizing their work with SyncTask
            </p>
            <Link 
              href="/auth/signup"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
            >
              Create Your Account
            </Link>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} SyncTask. Professional task management for teams.</p>
        </footer>
      </div>
    </div>
  );
}