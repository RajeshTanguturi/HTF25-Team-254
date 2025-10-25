import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // This function remains the same, handles initial load check
    useEffect(() => {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
            const userInfo = JSON.parse(storedUserInfo);
            try {
                const decodedToken = jwtDecode(userInfo.token);
                if (decodedToken.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser(userInfo);
                }
            } catch (error) {
                logout();
            }
        }
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await API.post('/auth/login', { email, password });
            localStorage.setItem('userInfo', JSON.stringify(data));
            setUser(data);
            toast.success("Login successful!");
            navigate('/dashboard');
        } catch (error) {
            const message = error.response?.data?.message || "Login failed!";
            toast.error(message);
        }
    };

    const signup = async (name, email, password) => {
        try {
            const { data } = await API.post('/auth/register', { name, email, password });
            localStorage.setItem('userInfo', JSON.stringify(data));
            setUser(data);
            toast.success("Signup successful!");
            navigate('/dashboard');
        } catch (error) {
             const message = error.response?.data?.message || "Signup failed!";
            toast.error(message);
        }
    };

    const logout = () => {
        localStorage.removeItem('userInfo');
        setUser(null);
        navigate('/login');
    };

    // --- NEW: Axios interceptor for handling 401 errors ---
    useEffect(() => {
        const responseInterceptor = API.interceptors.response.use(
            // If the response is successful, just return it
            (response) => response,
            // If there's an error in the response
            (error) => {
                // Check if the error is a 401 Unauthorized
                if (error.response && error.response.status === 401) {
                    toast.error("Your session has expired. Please log in again.");
                    logout();
                }
                // Important: Reject the promise so the original caller can handle it
                return Promise.reject(error);
            }
        );

        // Cleanup function to remove the interceptor when the component unmounts
        return () => {
            API.interceptors.response.eject(responseInterceptor);
        };
    }, [navigate]); // Add navigate as a dependency

    return (
        <AuthContext.Provider value={{ user, login, logout, signup }}>
            {children}
        </AuthContext.Provider>
    );
};