import React from "react";
import { useParams } from "react-router-dom";
import ConversationList from "./ConversationList.jsx";
import ChatWindow from "./ChatWindow.jsx";

export default function MessagesPage() {
  const [activeId, setActiveId] = React.useState(null);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-12 gap-0 h-[calc(100vh-80px)]">
        <aside className="col-span-5 border-r">
          <ConversationList activeId={activeId} onSelect={setActiveId} />
        </aside>
        <main className="col-span-7">
          <ChatWindow conversationId={activeId} />
        </main>
      </div>
    </div>
  );
}
