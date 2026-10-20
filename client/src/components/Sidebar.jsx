
import { useState, useEffect, useRef } from 'react';
import api from '../api';
import socket from '../socket';
import { avatarUrl } from '../utils/avatar';

// Format lastSeen time
function formatLastSeen(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return d.toLocaleDateString();
}

export default function Sidebar({
  currentUser,
  activeChat,
  onSelectChat,
  onOpenProfile,
  mobileHidden
}) {
  const [tab, setTab] = useState('chats');
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const searchTimeout = useRef(null);

  // Load friends and requests
  async function loadFriends() {
    try {
      const res = await api.get('/friends');
      setFriends(res.data.friends);
      setIncoming(res.data.incoming);
      setOutgoing(res.data.outgoing);
    } catch (err) {
      console.error('loadFriends error:', err);
    }
  }

  useEffect(() => {
    loadFriends();

    // Listen for online users updates
    socket.on('online-users', (users) => setOnlineUsers(users));

    // Listen for new messages — update unread counts
    socket.on('receive-message', (msg) => {
      if (msg.sender !== activeChat?._id) {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.sender]: (prev[msg.sender] || 0) + 1
        }));
      }
    });

    // Friend request update notification
    socket.on('friend-request-update', loadFriends);

    return () => {
      socket.off('online-users');
      socket.off('receive-message');
      socket.off('friend-request-update');
    };
  }, [activeChat]);

  // Clear unread when selecting a chat
  function handleSelectChat(friend) {
    setUnreadCounts(prev => ({ ...prev, [friend._id]: 0 }));
    onSelectChat(friend);
  }

  // Search users
  useEffect(() => {
    clearTimeout(searchTimeout.current);

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get(
          `/users/search?q=${encodeURIComponent(searchQuery)}`
        );
        setSearchResults(res.data);
      } catch (err) {
        setSearchResults([]);
      }
    }, 350);

    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  async function sendRequest(receiverId) {
    try {
      await api.post('/friends/request', { receiverId });

      // Notify receiver via socket
      socket.emit('friend-request-sent', { receiverId });

      loadFriends();

      setSearchResults(prev =>
        prev.map(u =>
          u._id === receiverId ? { ...u, _requestSent: true } : u
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Could not send request.');
    }
  }

  async function acceptRequest(requestId) {
    try {
      await api.post('/friends/accept', { requestId });
      loadFriends();
    } catch (err) {
      console.error('acceptRequest error:', err);
    }
  }

  async function rejectRequest(requestId) {
    try {
      await api.post('/friends/reject', { requestId });
      loadFriends();
    } catch (err) {
      console.error('rejectRequest error:', err);
    }
  }

  // Check if user is already a friend or request sent
  function getFriendStatus(userId) {
    if (friends.find(f => f._id === userId)) return 'friends';
    if (outgoing.find(o => o.receiver?._id === userId)) return 'sent';
    if (incoming.find(i => i.sender?._id === userId)) return 'incoming';
    return 'none';
  }

  const pendingCount = incoming.length;

  return (
    <div className={`sidebar${mobileHidden ? ' hidden' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">C</div>
          <span className="sidebar-brand-name">ChatHouse</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button
          id="tab-chats"
          className={`sidebar-tab ${tab === 'chats' ? 'active' : ''}`}
          onClick={() => setTab('chats')}
        >
          Chats
        </button>

        <button
          id="tab-search"
          className={`sidebar-tab ${tab === 'search' ? 'active' : ''}`}
          onClick={() => setTab('search')}
        >
          Search
        </button>

        <button
          id="tab-requests"
          className={`sidebar-tab ${tab === 'requests' ? 'active' : ''}`}
          onClick={() => setTab('requests')}
          style={{ position: 'relative' }}
        >
          Requests
          {pendingCount > 0 && (
            <span
              className="unread-badge"
              style={{
                position: 'absolute',
                top: 8,
                right: 12,
                fontSize: 10
              }}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Chats Tab */}
      {tab === 'chats' && (
        <div className="sidebar-content">
          {friends.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p>
                No friends yet.
                <br />
                Search to connect with people.
              </p>
            </div>
          ) : (
            friends.map(friend => {
              const isOnline = onlineUsers.includes(friend._id);
              const unread = unreadCounts[friend._id] || 0;

              return (
                <div
                  key={friend._id}
                  id={`chat-${friend._id}`}
                  className={`contact-item ${activeChat?._id === friend._id ? 'active' : ''
                    }`}
                  onClick={() => handleSelectChat(friend)}
                >
                  <div className="contact-avatar-wrap">
                    <img
                      src={avatarUrl(friend.avatarSeed)}
                      alt={friend.username}
                      className="avatar avatar-md"
                    />
                    {isOnline && (
                      <div className="online-dot contact-online-dot" />
                    )}
                  </div>

                  <div className="contact-info">
                    <div className="contact-name">@{friend.username}</div>
                    <div className="contact-last-msg">
                      {isOnline
                        ? '● Online'
                        : `Last seen ${formatLastSeen(friend.lastSeen)}`}
                    </div>
                  </div>

                  <div className="contact-meta">
                    {unread > 0 && (
                      <span className="unread-badge">{unread}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Search Tab */}
      {tab === 'search' && (
        <>
          <div className="sidebar-search">
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                id="search-input"
                type="text"
                placeholder="@username, email, or ChatHouse ID"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="sidebar-content">
            {searchQuery.length < 2 && (
              <div className="empty-state">
                <div className="empty-state-icon">🔎</div>
                <p>
                  Search by username,
                  <br />
                  email, or ChatHouse ID
                </p>
              </div>
            )}

            {searchResults.map(user => {
              const status = getFriendStatus(user._id);

              return (
                <div key={user._id} className="search-result-card">
                  <img
                    src={avatarUrl(user.avatarSeed)}
                    alt={user.username}
                    className="avatar avatar-md"
                  />

                  <div className="search-result-info">
                    <div className="search-result-name">
                      @{user.username}
                    </div>
                    <div className="search-result-id">
                      {user.chatHouseId}
                    </div>
                  </div>

                  <div className="search-result-actions">
                    {status === 'none' && (
                      <button
                        className="btn-primary"
                        onClick={() => sendRequest(user._id)}
                        style={{ padding: '5px 12px', fontSize: 12 }}
                      >
                        Add
                      </button>
                    )}

                    {status === 'sent' && (
                      <span className="badge badge-primary">Sent</span>
                    )}

                    {status === 'friends' && (
                      <span className="badge badge-success">Friends</span>
                    )}

                    {status === 'incoming' && (
                      <span className="badge badge-primary">Accept?</span>
                    )}
                  </div>
                </div>
              );
            })}

            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">😕</div>
                <p>No users found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div className="sidebar-content">
          {incoming.length === 0 && outgoing.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📬</div>
              <p>No pending requests</p>
            </div>
          )}

          {incoming.length > 0 && (
            <>
              <div
                style={{
                  padding: '10px 16px 4px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Incoming
              </div>

              {incoming.map(req => (
                <div key={req._id} className="request-card">
                  <img
                    src={avatarUrl(req.sender.avatarSeed)}
                    alt={req.sender.username}
                    className="avatar avatar-md"
                  />

                  <div className="request-info">
                    <div className="request-name">
                      @{req.sender.username}
                    </div>
                    <div className="request-vartaid">
                      {req.sender.chatHouseId}
                    </div>
                  </div>

                  <div className="request-actions">
                    <button
                      className="btn-primary"
                      onClick={() => acceptRequest(req._id)}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                    >
                      Accept
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={() => rejectRequest(req._id)}
                      style={{ padding: '5px 10px', fontSize: 12 }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {outgoing.length > 0 && (
            <>
              <div
                style={{
                  padding: '10px 16px 4px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Sent
              </div>

              {outgoing.map(req => (
                <div key={req._id} className="request-card">
                  <img
                    src={avatarUrl(req.receiver.avatarSeed)}
                    alt={req.receiver.username}
                    className="avatar avatar-md"
                  />

                  <div className="request-info">
                    <div className="request-name">
                      @{req.receiver.username}
                    </div>
                    <div className="request-vartaid">
                      {req.receiver.chatHouseId}
                    </div>
                  </div>

                  <span className="badge badge-primary">Pending</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Current user profile at bottom */}
      <div
        id="sidebar-profile"
        className="sidebar-user"
        onClick={onOpenProfile}
        title="View profile"
      >
        <img
          src={avatarUrl(currentUser.avatarSeed)}
          alt={currentUser.username}
          className="avatar avatar-sm"
        />

        <div className="sidebar-user-info">
          <div className="sidebar-user-name">
            @{currentUser.username}
          </div>
          <div className="sidebar-user-id">
            {currentUser.chatHouseId}
          </div>
        </div>

        <span style={{ fontSize: 16, color: 'var(--muted)' }}>⚙</span>
      </div>
    </div>
  );
}
