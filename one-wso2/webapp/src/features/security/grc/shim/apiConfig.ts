// The lifted source imports BACKEND_BASE_URL from its own @config/apiConfig.
// Re-exporting this app's value under that name is what lets every lifted call
// site come across unedited. The config key itself is this app's own —
// ONE_WSO2_GRC_PLATFORM_BACKEND_URL.
export { securityBackendUrl as BACKEND_BASE_URL } from "@config/apiConfig";
