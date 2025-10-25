import { FaTrophy, FaUser } from 'react-icons/fa';

const Leaderboard = ({ leaderboard }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-teal-400 flex items-center gap-2">
        <FaTrophy /> Leaderboard
      </h2>
      <ul className="space-y-3">
        {leaderboard && leaderboard.map((player, index) => (
          <li
            key={player.userId}
            className={`flex justify-between items-center p-3 rounded-md ${
              index === 0 ? 'bg-yellow-500/20' : 'bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`font-bold text-lg ${index < 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
                #{index + 1}
              </span>
              <span className="font-medium text-white">{player.userName}</span>
            </div>
            <div className="font-bold text-teal-300 text-lg">{player.score} pts</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Leaderboard;