import axios from "axios";

// Create an Axios instance with base configuration
export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});
