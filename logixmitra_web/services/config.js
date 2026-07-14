/** LogixMitra API configuration - single source of truth */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
export const UPLOAD_BASE_URL = import.meta.env.VITE_UPLOAD_URL || "http://127.0.0.1:8000";
export const APP_NAME = "LogixMitra";
export const APP_TAGLINE = "Smart Logistics Management Platform";
export const SUPPORT_EMAIL = "support@logixmitra.com";
export const WEBSITE_URL = "www.logixmitra.com";

export default API_BASE_URL;
