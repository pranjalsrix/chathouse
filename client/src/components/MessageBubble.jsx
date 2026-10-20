import { useState } from 'react';
import socket from '../socket';

// Reactions available
const REACTIONS = ['❤️', '👍', '😂', '🔥'];

export default function MessageBubble({ message, isSent, onReaction }) {
  const [showPicker, setShowPicker] = useState(false);

  function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function handleReaction(emoji) {
    onReaction(message._id, emoji);
    setShowPicker(false);
  }

  return (
    <div className={`message-row ${isSent ? 'sent' : 'received'}`}>
      <div
        className={`bubble ${isSent ? 'sent' : 'received'}`}
        onDoubleClick={() => setShowPicker(!showPicker)}
        title="Double-click to react"
      >
        {/* Message text */}
        {message.text}

        {/* Time + seen */}
        <span className="bubble-time">
          {formatTime(message.createdAt)}
          {isSent && (
            <span className="seen-indicator">
              {message.seen ? ' ✓✓' : ' ✓'}
            </span>
          )}
        </span>

        {/* Reaction display */}
        {message.reaction && (
          <span
            className="bubble-reaction"
            onClick={() => setShowPicker(!showPicker)}
          >
            {message.reaction}
          </span>
        )}

        {/* Reaction picker */}
        {showPicker && (
          <div className="reaction-picker">
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                className="reaction-btn"
                onClick={() => handleReaction(emoji)}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
            {/* Remove reaction */}
            {message.reaction && (
              <button
                className="reaction-btn"
                onClick={() => handleReaction(null)}
                title="Remove"
                style={{ fontSize: 14, opacity: 0.5 }}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
