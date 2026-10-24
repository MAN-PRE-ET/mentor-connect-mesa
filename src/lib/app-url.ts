export const APP_URL = "https://mentor-connect-mesa.lovable.app";

export const conversationUrl = (conversationId: string) => `${APP_URL}/chat/${encodeURIComponent(conversationId)}`;