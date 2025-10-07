import React from "react";
import { useParams } from "react-router-dom";
import { getBadge } from "../../api/notifications.api.js";
import { useSocket } from "../../contexts/SocketContext.jsx";

export default function NotificationBadge() {
  const { school } = useParams();
  const socket = useSocket();
  const [count, setCount] = React.useState(0);

  async function load() {
    const { unread } = await getBadge(school);
    setCount(unread);
  }
  React.useEffect(() => { load(); }, [school]);
  React.useEffect(() => {
    if (!socket) return;
    const onNew = () => setCount(c => c + 1);
    socket.on("notification:new", onNew);
    return () => socket.off("notification:new", onNew);
  }, [socket]);

  return (
    <div className="text-sm text-gray-600">
      🔔 <span className="font-medium">{count}</span>
    </div>
  );
}
