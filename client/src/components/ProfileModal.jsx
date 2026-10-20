import { useState } from 'react';
import { avatarUrl } from '../utils/avatar';

export default function ProfileModal({ user, onClose, onLogout }) {
  const [copied, setCopied] = useState('');

  function copy(text, label) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  // Close on overlay click
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
      >
        {/* Avatar */}
        <div className="profile-avatar-wrap">
          <img
            src={avatarUrl(user.avatarSeed)}
            alt={user.username}
            className="avatar avatar-xl"
          />
        </div>

        {/* Info */}
        <div className="profile-info">
          <h2 className="profile-username">@{user.username}</h2>
          <p className="profile-email">{user.email}</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span className="profile-vartaid">
              🪪 {user.chatHouseId}
            </span>
          </div>
        </div>

        <div className="divider" />

        {/* Copy actions */}
        <div className="profile-copy-actions">
          <button
            id="copy-username-btn"
            className="btn-secondary"
            onClick={() => copy(`@${user.username}`, 'username')}
          >
            {copied === 'username' ? '✓ Copied!' : 'Copy Username'}
          </button>

          <button
            id="copy-vartaid-btn"
            className="btn-secondary"
            onClick={() => copy(user.chatHouseId, 'chatHouseId')}
          >
            {copied === 'chatHouseId' ? '✓ Copied!' : 'Copy ChatHouse ID'}
          </button>
        </div>

        {copied && <p className="copied-toast">Copied to clipboard ✓</p>}

        <button
          id="profile-close-btn"
          className="btn-secondary profile-close-btn"
          onClick={onClose}
        >
          Close
        </button>

        <button
          id="logout-btn"
          className="profile-logout-btn"
          onClick={onLogout}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
