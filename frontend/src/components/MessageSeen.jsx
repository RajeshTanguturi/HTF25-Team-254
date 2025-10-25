import { FaEye } from 'react-icons/fa';

const MessageSeen = ({ seenBy, currentUser }) => {
    if (!seenBy || seenBy.length <= 1) {
        return null; // Don't show if only the sender has seen it
    }

    const otherViewers = seenBy.filter(viewer => viewer.userId !== (currentUser.id || currentUser._id));
    const viewerNames = otherViewers.map(v => v.userName).join(', ');

    return (
        <div className="relative group flex items-center justify-end mt-1">
            <FaEye className="text-teal-400 text-xs" />
            <div className="absolute bottom-full right-0 mb-2 w-max bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Seen by {viewerNames}
            </div>
        </div>
    );
};

export default MessageSeen;