// import { useState, useEffect } from 'react';
// import API from '../api';
// import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
// import { Doughnut, Bar } from 'react-chartjs-2';
// import { FaTrophy, FaCode, FaCheckCircle, FaClock, FaAward } from 'react-icons/fa';
// import useAuth from '../hooks/useAuth';

// ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// const StatCard = ({ icon, value, label, color }) => (
//     <div className={`bg-gray-800 p-6 rounded-lg border-l-4 ${color}`}>
//         <div className="flex items-center">
//             <div className="text-3xl text-gray-400 mr-4">{icon}</div>
//             <div>
//                 <div className="text-3xl font-bold text-white">{value}</div>
//                 <div className="text-gray-400">{label}</div>
//             </div>
//         </div>
//     </div>
// );

// const Profile = () => {
//     const { user } = useAuth();
//     const [profileData, setProfileData] = useState(null);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         const fetchProfileData = async () => {
//             try {
//                 const { data } = await API.get('/users/profile');
//                 setProfileData(data);
//             } catch (error) {
//                 console.error("Failed to fetch profile data", error);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchProfileData();
//     }, []);

//     if (loading) {
//         return (
//             <div className="flex justify-center items-center h-64">
//                 <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400"></div>
//             </div>
//         );
//     }

//     if (!profileData) {
//         return <div className="text-center text-red-500">Failed to load profile data.</div>;
//     }

//     const { stats, charts, recentActivity } = profileData;

//     const statusChartData = {
//         labels: charts.status.map(s => s._id),
//         datasets: [{
//             label: 'Submissions',
//             data: charts.status.map(s => s.count),
//             backgroundColor: ['#22C55E', '#F87171', '#FBBF24', '#60A5FA', '#818CF8', '#A78BFA'],
//             borderColor: ['#1F2937'],
//             borderWidth: 2,
//         }],
//     };
    
//     const languageChartData = {
//         labels: charts.language.map(l => l._id.charAt(0).toUpperCase() + l._id.slice(1)),
//         datasets: [{
//             label: 'Submissions by Language',
//             data: charts.language.map(l => l.count),
//             backgroundColor: 'rgba(34, 211, 238, 0.6)',
//             borderColor: 'rgba(34, 211, 238, 1)',
//             borderWidth: 1,
//         }],
//     };

//     const doughnutOptions = {
//         maintainAspectRatio: true,
//         plugins: {
//             legend: {
//                 position: 'top',
//                 labels: {
//                     color: '#D1D5DB' // text-gray-300
//                 }
//             }
//         }
//     };
    
//     const barOptions = {
//         responsive: true,
//         plugins: {
//             legend: { display: false },
//             title: { display: false }
//         },
//         scales: {
//             x: { ticks: { color: '#9CA3AF' } }, // text-gray-400
//             y: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } } // text-gray-600
//         }
//     };

//     return (
//         <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 text-white space-y-12">
//             <div>
//                 <h1 className="text-4xl font-extrabold tracking-tight">Welcome back, {user.name}!</h1>
//                 <p className="text-gray-400 mt-2">Member since {new Date(profileData.user.joined).toLocaleDateString()}</p>
//             </div>

//             {/* Updated grid to be more responsive */}
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                 <StatCard icon={<FaTrophy />} value={stats.totalContests} label="Contests Joined" color="border-yellow-400" />
//                 <StatCard icon={<FaAward />} value={stats.contestsWon} label="Contests Won" color="border-amber-400" />
//                 <StatCard icon={<FaCode />} value={stats.totalSubmissions} label="Total Submissions" color="border-blue-400" />
//                 <StatCard icon={<FaCheckCircle />} value={`${stats.acceptedSubmissions} (${stats.totalSubmissions > 0 ? ((stats.acceptedSubmissions / stats.totalSubmissions) * 100).toFixed(1) : 0}%)`} label="Accepted" color="border-green-400" />
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
//                 <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg">
//                     <h2 className="text-xl font-bold mb-4">Submission Status</h2>
//                     <Doughnut data={statusChartData} options={doughnutOptions} />
//                 </div>
//                 <div className="lg:col-span-3 bg-gray-800 p-6 rounded-lg">
//                     <h2 className="text-xl font-bold mb-4">Language Usage</h2>
//                     <Bar data={languageChartData} options={barOptions} />
//                 </div>
//             </div>

//             <div className="bg-gray-800 p-6 rounded-lg">
//                 <h2 className="text-xl font-bold mb-4 flex items-center gap-3"><FaClock /> Recent Activity</h2>
//                 <div className="overflow-x-auto">
//                     <table className="w-full text-left">
//                         <thead className="text-xs text-gray-400 uppercase bg-gray-700">
//                             <tr>
//                                 <th className="px-6 py-3">Problem</th>
//                                 <th className="px-6 py-3">Status</th>
//                                 <th className="px-6 py-3">Language</th>
//                                 <th className="px-6 py-3">Date</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {recentActivity.length > 0 ? (
//                                 recentActivity.map(activity => (
//                                     <tr key={activity._id} className="border-b border-gray-700 hover:bg-gray-700/50">
//                                         <td className="px-6 py-4 font-medium">{activity.problemTitle}</td>
//                                         <td className={`px-6 py-4 font-bold ${activity.status === 'Accepted' ? 'text-green-400' : 'text-red-400'}`}>{activity.status}</td>
//                                         <td className="px-6 py-4 capitalize">{activity.language}</td>
//                                         <td className="px-6 py-4 text-gray-400">{new Date(activity.createdAt).toLocaleString()}</td>
//                                     </tr>
//                                 ))
//                             ) : (
//                                 <tr>
//                                     <td colSpan="4" className="text-center py-8 text-gray-500">No recent activity found.</td>
//                                 </tr>
//                             )}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Profile;
import React from 'react';
import { useState, useEffect } from 'react';
import API from '../api';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import { FaTrophy, FaCode, FaCheckCircle, FaAward } from 'react-icons/fa';
import { MdOutlineTrendingUp } from 'react-icons/md';
import useAuth from '../hooks/useAuth';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title
);

const StatCard = ({ icon, value, label, color }) => (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-md flex flex-col justify-center items-start hover:shadow-lg transition">
        <div className={`w-12 h-12 flex items-center justify-center rounded-full ${color} mb-4`}>
            {icon}
        </div>
        <div className="text-3xl font-bold text-white">{value}</div>
        <div className="text-gray-400">{label}</div>
    </div>
);

const StatusBadge = ({ status }) => {
    const colors = {
        Accepted: 'bg-green-500/20 text-green-400 border border-green-500/30',
        Wrong: 'bg-red-500/20 text-red-400 border border-red-500/30',
        Pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    };
    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-500/20 text-gray-300 border border-gray-500/30'}`}
        >
            {status}
        </span>
    );
};

const Profile = () => {
    const { user } = useAuth() || {};
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const { data } = await API.get('/users/profile');
                setProfileData(data);
            } catch (error) {
                console.error('Failed to fetch profile data', error);
                setProfileData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400"></div>
            </div>
        );
    }

    if (!profileData) {
        return <div className="text-center text-red-500">Failed to load profile data.</div>;
    }

    // Defensive defaults in case the API shape changes or some fields are missing
    const stats = profileData.stats || {
        totalContests: 0,
        contestsWon: 0,
        totalSubmissions: 0,
        acceptedSubmissions: 0,
    };

    const charts = profileData.charts || {
        status: [], // expected: [{ _id: 'Accepted', count: 10 }, ...]
        submissionsOverTime: [], // expected: [{ date: '2025-08-01', count: 3 }, ...]
    };

    const recentActivity = Array.isArray(profileData.recentActivity) ? profileData.recentActivity : [];

    // Doughnut Chart (Status) - safe mapping
    const statusLabels = (charts.status || []).map((s) => s._id || 'Unknown');
    const statusDataPoints = (charts.status || []).map((s) => s.count || 0);

    const statusChartData = {
        labels: statusLabels,
        datasets: [
            {
                label: 'Submissions',
                data: statusDataPoints,
                backgroundColor: [
                    '#22C55E',
                    '#F87171',
                    '#FBBF24',
                    '#60A5FA',
                    '#818CF8',
                    '#A78BFA',
                ].slice(0, Math.max(1, statusLabels.length)),
                borderColor: ['#1F2937'],
                borderWidth: 2,
            },
        ],
    };

    // Line Chart (Submissions over time) - safe mapping
    const submissionDates = (charts.submissionsOverTime || []).map((d) =>
        d?.date ? new Date(d.date).toLocaleDateString() : 'Unknown'
    );
    const submissionCounts = (charts.submissionsOverTime || []).map((d) => d?.count || 0);

    const submissionTrendData = {
        labels: submissionDates,
        datasets: [
            {
                label: 'Submissions',
                data: submissionCounts,
                fill: false,
                borderColor: '#14B8A6',
                backgroundColor: '#14B8A6',
                tension: 0.3,
            },
        ],
    };

    const chartOptions = {
        plugins: {
            legend: {
                labels: { color: '#D1D5DB' },
            },
        },
        scales: {
            x: { ticks: { color: '#9CA3AF' } },
            y: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } },
        },
        maintainAspectRatio: false,
    };

    const joinedDate = profileData.user?.joined ? new Date(profileData.user.joined).toLocaleDateString() : 'Unknown';

    // helper for safe accepted percentage display
    const acceptedCount = stats.acceptedSubmissions || 0;
    const totalSubmissions = stats.totalSubmissions || 0;
    const acceptedPercentage =
        totalSubmissions > 0 ? ((acceptedCount / totalSubmissions) * 100).toFixed(1) : '0.0';

    return (
        <div className="max-w-7xl mx-auto py-10 px-6 text-white space-y-12">
            <div>
                <h1 className="text-4xl font-extrabold">
                    Welcome back, {user?.name || profileData.user?.name || 'User'}!
                </h1>
                <p className="text-gray-400 mt-2">Member since {joinedDate}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<FaTrophy className="text-yellow-400" />}
                    value={stats.totalContests ?? 0}
                    label="Contests Joined"
                    color="bg-yellow-500/20"
                />
                <StatCard
                    icon={<FaAward className="text-amber-400" />}
                    value={stats.contestsWon ?? 0}
                    label="Contests Won"
                    color="bg-amber-500/20"
                />
                <StatCard
                    icon={<FaCode className="text-blue-400" />}
                    value={stats.totalSubmissions ?? 0}
                    label="Total Submissions"
                    color="bg-blue-500/20"
                />
                <StatCard
                    icon={<FaCheckCircle className="text-green-400" />}
                    value={`${acceptedCount} (${acceptedPercentage}%)`}
                    label="Accepted"
                    color="bg-green-500/20"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-2xl shadow-md" style={{ minHeight: 300 }}>
                    <h2 className="text-xl font-bold mb-4">Submission Status</h2>
                    <div style={{ height: 260 }}>
                        <Doughnut data={statusChartData} options={chartOptions} />
                    </div>
                </div>
                <div className="lg:col-span-3 bg-gray-800 p-6 rounded-2xl shadow-md" style={{ minHeight: 300 }}>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MdOutlineTrendingUp /> Submissions Over Time
                    </h2>
                    <div style={{ height: 260 }}>
                        <Line data={submissionTrendData} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-md">
                <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                            <tr>
                                <th className="px-6 py-3">Problem</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Language</th>
                                <th className="px-6 py-3">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentActivity.length > 0 ? (
                                recentActivity.map((activity, idx) => (
                                    <tr
                                        key={activity?._id ?? idx}
                                        className="border-b border-gray-700 hover:bg-gray-700/50"
                                    >
                                        <td className="px-6 py-4 font-medium">{activity?.problemTitle ?? 'Unknown Problem'}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={activity?.status ?? 'Unknown'} />
                                        </td>
                                        <td className="px-6 py-4 capitalize">{activity?.language ?? 'unknown'}</td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {activity?.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center py-8 text-gray-500">
                                        No recent activity found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Profile;
