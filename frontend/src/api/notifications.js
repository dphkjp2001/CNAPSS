import axios from "axios";

export const fetchNotifications = (limit = 20) =>
  axios.get(`/api/notifications?limit=${limit}`).then(r => r.data);

export const fetchUnreadCount = () =>
  axios.get(`/api/notifications/unread-count`).then(r => r.data);

export const markRead = (id) =>
  axios.patch(`/api/notifications/${id}/read`).then(r => r.data);

export const markAllRead = () =>
  axios.patch(`/api/notifications/read-all`).then(r => r.data);
