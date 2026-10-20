import { useState, useEffect, useRef, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react';
import api from '../api';
import socket from '../socket';
import MessageBubble from './MessageBubble';

import { avatarUrl } from '../utils/avatar';

function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChatWindow({ currentUser, friend, onlineUsers, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const inputRef = useRef(null);

  const isOnline = onlineUsers.includes(friend._id);

  // Load messages
  useEffect(() => {
    if (!friend?._id) return;
    setMessages([]);
    setText('');
    setShowEmoji(false);

    api.get(`/messages/${friend._id}`).then(res => {
      setMessages(res.data);
      // Notify sender that we've seen messages
      socket.emit('message-seen', {
        senderId: friend._id,
        receiverId: currentUser._id
      });
    });

    inputRef.current?.focus();
  }, [friend._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Socket listeners
  useEffect(() => {
    // Receive new message
    function onReceiveMessage(msg) {
      if (
        (msg.sender === friend._id && msg.receiver === currentUser._id) ||
        (msg.sender === currentUser._id && msg.receiver === friend._id)
      ) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        // Mark as seen immediately if we're viewing this chat
        if (msg.sender === friend._id) {
          socket.emit('message-seen', {
            senderId: friend._id,
            receiverId: currentUser._id
          });
        }
      }
    }

    // Confirm sent message
    function onMessageSent(msg) {
      setMessages(prev => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    }

    // Typing indicator
    function onTyping({ senderId }) {
      if (senderId === friend._id) setIsTyping(true);
    }

    function onStopTyping({ senderId }) {
      if (senderId === friend._id) setIsTyping(false);
    }

    // Messages seen update (update seen status for sent messages)
    function onMessagesSeen({ by }) {
      if (by === friend._id) {
        setMessages(prev => prev.map(m =>
          m.sender === currentUser._id ? { ...m, seen: true } : m
        ));
      }
    }

    // Reaction updated
    function onReactionUpdated(updatedMsg) {
      setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
    }

    socket.on('receive-message', onReceiveMessage);
    socket.on('message-sent', onMessageSent);
    socket.on('typing', onTyping);
    socket.on('stop-typing', onStopTyping);
    socket.on('messages-seen', onMessagesSeen);
    socket.on('reaction-updated', onReactionUpdated);

    return () => {
      socket.off('receive-message', onReceiveMessage);
      socket.off('message-sent', onMessageSent);
      socket.off('typing', onTyping);
      socket.off('stop-typing', onStopTyping);
      socket.off('messages-seen', onMessagesSeen);
      socket.off('reaction-updated', onReactionUpdated);
    };
  }, [friend._id, currentUser._id]);

  // Send message
  function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed) return;
    socket.emit('send-message', {
      senderId: currentUser._id,
      receiverId: friend._id,
      text: trimmed
    });
    setText('');
    setShowEmoji(false);
    // Stop typing
    socket.emit('stop-typing', { senderId: currentUser._id, receiverId: friend._id });
  }

  // Handle Enter key
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Typing indicator emit
  function handleTextChange(e) {
    setText(e.target.value);
    socket.emit('typing', { senderId: currentUser._id, receiverId: friend._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('stop-typing', { senderId: currentUser._id, receiverId: friend._id });
    }, 1500);
  }

  // Add emoji to input
  function onEmojiClick(emojiData) {
    setText(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  }

  // Handle reaction
  function handleReaction(messageId, reaction) {
    socket.emit('add-reaction', {
      messageId,
      reaction,
      senderId: currentUser._id,
      receiverId: friend._id
    });
  }

  // Group messages by date
  function groupByDate(msgs) {
    const groups = [];
    let lastDate = null;
    msgs.forEach(msg => {
      const date = formatDate(msg.createdAt);
      if (date !== lastDate) {
        groups.push({ type: 'separator', date });
        lastDate = date;
      }
      groups.push({ type: 'message', msg });
    });
    return groups;
  }

  const grouped = groupByDate(messages);

  return (
    <>
      {/* Chat Header */}
      <div className="chat-header">
        {/* Back button — visible on mobile */}
        <button className="btn-icon chat-header-back" onClick={onBack} title="Back">
          ←
        </button>
        <img src={avatarUrl(friend.avatarSeed)} alt={friend.username} className="avatar avatar-md" />
        <div className="chat-header-info">
          <div className="chat-header-name">@{friend.username}</div>
          <div className={`chat-header-status ${isOnline ? 'online' : ''}`}>
            {isOnline ? '● Online' : `Last seen ${new Date(friend.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </div>
        </div>
        <span className="badge badge-primary" style={{ fontSize: 11 }}>{friend.chathouseId}</span>
      </div>

      {/* Messages */}
      <div className="chat-messages" onClick={() => showEmoji && setShowEmoji(false)}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <p>No messages yet.<br />Say hello to <strong>@{friend.username}</strong>!</p>
          </div>
        )}

        {grouped.map((item, i) => {
          if (item.type === 'separator') {
            return (
              <div key={`sep-${i}`} className="date-separator">{item.date}</div>
            );
          }
          const msg = item.msg;
          const isSent = msg.sender === currentUser._id;
          return (
            <MessageBubble
              key={msg._id}
              message={msg}
              isSent={isSent}
              onReaction={handleReaction}
            />
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span /><span /><span />
            </div>
            <span>{friend.username} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <div className="chat-input-wrap">
          <textarea
            id="message-input"
            ref={inputRef}
            className="chat-input"
            placeholder={`Message @${friend.username}...`}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            id="emoji-toggle-btn"
            className="emoji-toggle-btn"
            onClick={() => setShowEmoji(!showEmoji)}
            title="Emoji"
            type="button"
          >
            😊
          </button>

          {showEmoji && (
            <div className="emoji-picker-wrapper">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                height={380}
                width={320}
                searchDisabled={false}
                skinTonesDisabled
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}
        </div>

        <button
          id="send-btn"
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={!text.trim()}
          title="Send"
        >
          ➤
        </button>
      </div>
    </>
  );
}
