/**
 * avatar.js — Shared avatar URL utility
 *
 * Uses ui-avatars.com — free, no API key, no rate limits.
 * Generates initials-based avatars from the username.
 *
 * Examples:
 *   avatarUrl('alice')      → "A"  on indigo background
 *   avatarUrl('john_doe')   → "JD" on indigo background
 */

export function avatarUrl(seed) {
  // Convert username underscores to spaces so initials work correctly
  // e.g. "john_doe" → "john doe" → initials "JD"
  const name = (seed || 'U').replace(/_/g, ' ');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4F46E5&color=ffffff&size=128&bold=true&format=png`;
}
