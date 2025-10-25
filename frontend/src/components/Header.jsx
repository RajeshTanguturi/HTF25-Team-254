// import { Link, useNavigate } from 'react-router-dom';
// import useAuth from '../hooks/useAuth'; // Corrected: default import
// import { FaUserCircle } from 'react-icons/fa';

// const Header = () => {
//   const { user, logout } = useAuth();
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   return (
//     <header className="bg-gray-800 shadow-md">
//       <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
//         <Link to={user ? "/dashboard" : "/"} className="text-2xl font-bold text-teal-400">
//           CodeIt
//         </Link>
//         <div className="flex items-center space-x-4">
//           {user ? (
//             <>
//               <div className="flex items-center space-x-2">
//                 <FaUserCircle className="text-xl text-gray-400" />
//                 <span className="text-gray-300 font-medium">{user.name}</span>
//               </div>
//               <button
//                 onClick={handleLogout}
//                 className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-200"
//               >
//                 Logout
//               </button>
//             </>
//           ) : (
//             <>
//               <Link to="/login" className="text-gray-300 hover:text-white transition duration-200">
//                 Login
//               </Link>
//               <Link
//                 to="/signup"
//                 className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded transition duration-200"
//               >
//                 Sign Up
//               </Link>
//             </>
//           )}
//         </div>
//       </nav>
//     </header>
//   );
// };

// export default Header;
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { FaUserCircle } from 'react-icons/fa';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-gray-800 text-white shadow-md">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to={user ? "/home" : "/"} className="text-2xl font-bold text-teal-400">
          CodeIt
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/home" className="text-gray-300 hover:text-white transition-colors">Home</Link>
              <Link to="/library" className="text-gray-300 hover:text-white transition-colors">Library</Link>
              <Link to="/dashboard" className="text-gray-300 hover:text-white transition-colors">Create</Link>
              <span className="text-gray-600">|</span>
              
              {/* Make user name and icon a link to profile */}
              <Link to="/profile" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <FaUserCircle className="text-xl" />
                <span className="font-medium">{user.name}</span>
              </Link>
              
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white transition-colors">Login</Link>
              <Link to="/signup" className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;