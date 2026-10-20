import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import ProfileModal from '../components/ProfileModal';
import '../Chat.css';

export default function ChatPage() {
  const navigate = useNavigate();
  const [currentUser] = useState(() =>
    JSON.parse(localStorage.getItem('chathouse_user'))
  );
  const [activeChat, setActiveChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    // Connect socket and identify user
    socket.connect();
    socket.emit('connect-user', currentUser._id);

    // Track online users
    socket.on('online-users', (users) => setOnlineUsers(users));

    return () => {
      socket.disconnect();
      socket.off('online-users');
    };
  }, []);

  function handleSelectChat(friend) {
    setActiveChat(friend);
    setSidebarVisible(false);
  }

  function handleBack() {
    setSidebarVisible(true);
    setActiveChat(null);
  }

  function handleLogout() {
    socket.disconnect();
    localStorage.removeItem('chathouse_token');
    localStorage.removeItem('chathouse_user');
    navigate('/auth');
  }

  if (!currentUser) return null;

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onOpenProfile={() => setShowProfile(true)}
        mobileHidden={!sidebarVisible}
      />

      {/* Chat area */}
      <div className="chat-main">
        {activeChat ? (
          <ChatWindow
            currentUser={currentUser}
            friend={activeChat}
            onlineUsers={onlineUsers}
            onBack={handleBack}
          />
        ) : (
          <div className="chat-placeholder">
            <div className="chat-placeholder-icon">💬</div>
            <h3>Welcome to ChatHouse</h3>
            <p>Select a conversation from the sidebar to start chatting.</p>
          </div>
        )}
      </div>

      {/* Profile modal */}
      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}