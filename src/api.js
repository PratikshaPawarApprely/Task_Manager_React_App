
import axios from "axios";

// API V1
const api = axios.create({
  baseURL: "/api/v1",
});

// API V2
const apiV2 = axios.create({
  baseURL: "/api/v2",
});

// Attach JWT token to both API versions
const addAuthToken = (config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

// Add authentication to both APIs
api.interceptors.request.use(addAuthToken);
apiV2.interceptors.request.use(addAuthToken);

// Export API V1 and V2
export const apiV1 = api;
export { apiV2 };

// Keep the existing default export for other components
export default api;
