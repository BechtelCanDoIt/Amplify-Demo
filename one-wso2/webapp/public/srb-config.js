// LOCAL ONLY (gitignored). ThunderID sign-in + local Amplify stack via the dev proxy on :9089.
window.config = {
  ONE_WSO2_AUTH_BASE_URL: "https://thunder.amp.aten:8443",
  ONE_WSO2_AUTH_CLIENT_ID: "vD4DJ9fdlLC3RXIQ8vQPIA",
  ONE_WSO2_AUTH_WELL_KNOWN_URL: "https://thunder.amp.aten:8443/.well-known/openid-configuration",
  ONE_WSO2_AUTH_SIGN_IN_REDIRECT_URL: "http://localhost:3000",
  ONE_WSO2_AUTH_SIGN_OUT_REDIRECT_URL: "http://localhost:3000",
  ONE_WSO2_THEME: "wso2",
  // Local people-stub (Compose): leaderboard photos and names. Other people-app screens will error.
  ONE_WSO2_PEOPLE_BACKEND_URL: "http://localhost:19092",
  ONE_WSO2_AMPLIFY_BACKEND_URL: "http://localhost:9089",
  ONE_WSO2_AMPLIFY_LINKEDIN_ORG_URN: "urn:li:organization:143998207",
  ONE_WSO2_AMPLIFY_POST_LINK_ORIGINS: ["https://www.linkedin.com", "https://linkedin.com", "http://localhost:19091"],
  ONE_WSO2_PREVIEW_FEATURES: { amplify: true },
};
