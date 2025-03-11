// Get the API URL from environment variables, fallback to localhost for development
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Helper function to build API endpoints
export const getApiEndpoint = (path) => {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_URL}/${cleanPath}`;
};
