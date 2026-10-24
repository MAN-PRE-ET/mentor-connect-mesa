export const APP_URL = "https://mentor-connect-mesa.lovable.app";

export const conversationUrl = (conversationId: string) => `${APP_URL}/chat/${encodeURIComponent(conversationId)}`;
export const friendInviteUrl = (goal: string) => `https://wa.me/?text=${encodeURIComponent(`I'm getting career advice from real mentors on Mentor Connect. ${goal} — ${APP_URL}`)}`;