import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import toast from 'react-hot-toast';
import { FaClone, FaQuestionCircle, FaClock, FaUser } from 'react-icons/fa';

const Library = () => {
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cloningId, setCloningId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchContests = async () => {
            setLoading(true);
            try {
                const { data } = await API.get('/contest/library');
                setContests(data);
            } catch (error) {
                toast.error("Failed to load contest library.");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchContests();
    }, []);

    const handleCloneContest = async (contestId) => {
        setCloningId(contestId);
        const toastId = toast.loading("Cloning contest...");
        try {
            const { data } = await API.post(`/contest/clone/${contestId}`);
            toast.success("Contest cloned successfully! Redirecting to lobby...", { id: toastId });
            navigate(`/contest/${data.roomId}/lobby`);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to clone contest.", { id: toastId });
            setCloningId(null);
        }
    };

    if (loading) {
        return <div className="text-center text-white py-10">Loading contest library...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold text-white text-center mb-8">Contest Library</h1>
            {contests.length === 0 ? (
                <div className="text-center text-gray-400 bg-gray-800 p-8 rounded-lg">
                    <h2 className="text-2xl font-bold mb-2">The Library is Empty</h2>
                    <p>No contests have been completed yet. Once a contest finishes, it will appear here for others to clone and re-host.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contests.map(contest => (
                        <div key={contest._id} className="bg-gray-800 rounded-lg p-6 flex flex-col justify-between border border-gray-700 hover:border-indigo-500 transition-all">
                            <div>
                                <h2 className="text-xl font-bold text-teal-400 truncate">
                                    {contest.questions[0]?.title || 'Contest'}
                                    {contest.questions.length > 1 && ` + ${contest.questions.length - 1} more`}
                                </h2>
                                <div className="text-sm text-gray-500 mt-2 mb-4">
                                    Created on {new Date(contest.createdAt).toLocaleDateString()}
                                </div>
                                <div className="space-y-2 text-gray-300">
                                    <p className="flex items-center gap-2"><FaUser /> Created by: {contest.createdBy?.name || 'Unknown'}</p>
                                    <p className="flex items-center gap-2"><FaQuestionCircle /> Questions: {contest.questions.length}</p>
                                    <p className="flex items-center gap-2"><FaClock /> Duration: {contest.duration} minutes</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleCloneContest(contest._id)}
                                disabled={cloningId === contest._id}
                                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaClone />
                                {cloningId === contest._id ? 'Cloning...' : 'Clone & Create'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Library;