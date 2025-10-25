// import axios from 'axios';

// const API = axios.create({
//   baseURL: 'http://localhost:5000/api',
// });

// API.interceptors.request.use((req) => {
//   const userInfo = localStorage.getItem('userInfo');
//   if (userInfo) {
//     const token = JSON.parse(userInfo).token;
//     req.headers.Authorization = `Bearer ${token}`;
//   }
//   return req;
// });

// export default API;

// frontend/src/api/index.js
import axios from 'axios';

const API = axios.create({
  // Use the VITE environment variable for the base URL
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use((req) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    const token = JSON.parse(userInfo).token;
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;