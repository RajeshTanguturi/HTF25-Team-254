// import { Link } from 'react-router-dom';

// const Home = () => {
//   return (
//     <div className="text-center mt-20">
      
//       <h1 className="text-5xl font-extrabold text-white mb-4">Welcome to CodeIt</h1>
//       <p className="text-xl text-gray-400 mb-8">
//         The ultimate platform for live coding contests with your friends.
//       </p>
//       <div>
//         <Link
//           to="/signup"
//           className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-full text-lg transition duration-300 ease-in-out transform hover:scale-105"
//         >
//           Get Started
//         </Link>
//       </div>
//     </div>
//   );
// };

// export default Home;
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import toast from 'react-hot-toast';
import { FaUsers, FaCode, FaFileCode, FaCubes, FaArrowRight } from 'react-icons/fa';

const StatCard = ({ icon, value, label, color }) => (
    <div className="bg-gray-800 p-6 rounded-lg flex items-center space-x-4 border border-gray-700">
        <div className={`text-3xl ${color}`}>{icon}</div>
        <div>
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-gray-400">{label}</div>
        </div>
    </div>
);

const Home = () => {
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await API.get('/contest/stats');
                setStats(data);
            } catch (error) {
                toast.error("Could not load platform statistics.");
                console.error("Error fetching stats:", error);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-white">
            <div className="text-center">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                    Welcome to <span className="text-teal-400">CodeIt</span>
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400">
                    Your real-time collaborative coding contest platform. Create, compete, and conquer.
                </p>
            </div>

            <div className="mt-12">
                <h2 className="text-2xl font-bold text-center mb-6">Platform at a Glance</h2>
                {stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard icon={<FaCubes />} value={stats.totalContests} label="Contests Hosted" color="text-blue-400" />
                        <StatCard icon={<FaUsers />} value={stats.totalUsers} label="Active Coders" color="text-green-400" />
                        <StatCard icon={<FaCode />} value={stats.totalSubmissions} label="Submissions Made" color="text-yellow-400" />
                        <StatCard icon={<FaFileCode />} value={stats.totalLinesOfCode.toLocaleString()} label="Lines of Code" color="text-purple-400" />
                    </div>
                ) : (
                     <div className="text-center text-gray-500">Loading stats...</div>
                )}
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-teal-500 transition-all">
                    <h3 className="text-2xl font-bold mb-4">Create a New Contest</h3>
                    <p className="text-gray-400 mb-6">
                        Craft a custom contest from scratch or use our AI generator to build the perfect challenge for your team.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2"
                    >
                        Create from Scratch <FaArrowRight />
                    </button>
                </div>
                <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 hover:border-indigo-500 transition-all">
                    <h3 className="text-2xl font-bold mb-4">Browse Contest Library</h3>
                    <p className="text-gray-400 mb-6">
                        Explore past contests created by the community. Clone any contest to host it yourself instantly.
                    </p>
                    <button
                        onClick={() => navigate('/library')}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2"
                    >
                        Go to Library <FaArrowRight />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Home;