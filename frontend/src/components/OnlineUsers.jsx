import { FaUsers } from 'react-icons/fa';

const OnlineUsers = ({ users }) => {
    return (
        <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-white font-semibold">
                <FaUsers className="text-teal-400" />
                <span>Online ({users.length})</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300 overflow-x-auto">
                {users.slice(0, 5).map(user => (
                    <span key={user.id} className="bg-gray-700 px-2 py-1 rounded-md flex-shrink-0">{user.name}</span>
                ))}
                {users.length > 5 && (
                    <span className="bg-gray-700 px-2 py-1 rounded-md flex-shrink-0">+{users.length - 5} more</span>
                )}
            </div>
        </div>
    );
};

export default OnlineUsers;