import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import API from '../api';
import useAuth from '../hooks/useAuth';
import { FaUsers, FaCopy, FaPlayCircle } from 'react-icons/fa';

const ContestLobby = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contest, setContest] = useState(null);
    const [participants, setParticipants] = useState([]);
    const socket = useRef(null);
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    useEffect(() => {
        const fetchLobbyData = async () => {
            try {
                const { data } = await API.get(`/contest/${roomId}/lobby`);
                setContest(data);
                setParticipants(data.participants);
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to load lobby.");
                navigate('/dashboard');
            }
        };
        fetchLobbyData();
        
        socket.current = io(SOCKET_URL);
        
        const handleParticipantJoined = (updatedParticipants) => {
            setParticipants(updatedParticipants);
            toast.success('A new player has joined!');
        };
        
        const handleContestStarted = () => {
            toast.success('The contest is starting now!', { duration: 4000 });
            navigate(`/contest/${roomId}`);
        };

        socket.current.on('connect', () => {
            socket.current.emit('joinRoom', roomId);
            socket.current.on('participant:joined', handleParticipantJoined);
            socket.current.on('contest:started', handleContestStarted);
        });

        return () => {
            if (socket.current) {
                socket.current.off('participant:joined', handleParticipantJoined);
                socket.current.off('contest:started', handleContestStarted);
                socket.current.disconnect();
            }
        };
    }, [roomId, navigate]);

    const handleStartContest = async () => {
        try {
            await API.post(`/contest/${roomId}/start`);
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not start the contest.");
        }
    };
    
    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        toast.success("Room Code copied to clipboard!");
    }

    if (!contest) {
        return <div className="text-center mt-20 text-xl">Loading Lobby...</div>;
    }
    
    const isCreator = user?.id === contest.createdBy || user?._id === contest.createdBy;

    return (
        <div className="max-w-3xl mx-auto mt-10 p-8 bg-gray-800 rounded-lg shadow-xl text-center">
            <h1 className="text-4xl font-bold text-teal-400 mb-2">Contest Lobby</h1>
            <p className="text-gray-400 mb-6">Waiting for the contest creator to start the match.</p>
            
            <div className="bg-gray-900/50 p-4 rounded-lg mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">Share this Room Code with your friends</h2>
                <div className="flex items-center justify-center gap-4 bg-gray-700 p-3 rounded-md">
                    <p className="text-2xl font-mono text-yellow-300 tracking-widest">{roomId}</p>
                    <button onClick={copyRoomId} className="p-2 bg-teal-500 hover:bg-teal-600 rounded-md" title="Copy Code">
                        <FaCopy />
                    </button>
                </div>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg mb-8">
                 <h2 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                    <FaUsers /> Players Joined ({participants.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* FIX: Use a more stable key for rendering the list */}
                    {participants.map(p => (
                        <div key={p.userId?._id || p.userName} className="bg-gray-700 p-3 rounded-md text-white font-medium">
                            {p.userName}
                        </div>
                    ))}
                </div>
            </div>

            {isCreator && (
                <button
                    onClick={handleStartContest}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md transition duration-200 text-xl flex items-center justify-center gap-3"
                >
                    <FaPlayCircle /> Start Contest
                </button>
            )}
        </div>
    );
};

export default ContestLobby;