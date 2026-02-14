/**
 * Room utilities for GyroLaser
 * Generates random 6-character room IDs and validates format
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous 0/O, 1/I
const ROOM_ID_LENGTH = 6;

/**
 * Generate a random 6-character room ID
 * @returns {string} Room ID (e.g. "A3X9K2")
 */
function generateRoomId() {
  let id = '';
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return id;
}

/**
 * Validate room ID format (6 alphanumeric chars)
 * @param {string} roomId - Room ID to validate
 * @returns {boolean}
 */
function isValidRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') return false;
  const trimmed = roomId.trim().toUpperCase();
  if (trimmed.length !== ROOM_ID_LENGTH) return false;
  return /^[A-Z0-9]+$/.test(trimmed);
}

/**
 * Normalize room ID (trim, uppercase) for consistent lookup
 * @param {string} roomId
 * @returns {string|null} Normalized ID or null if invalid
 */
function normalizeRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') return null;
  const trimmed = roomId.trim().toUpperCase();
  return isValidRoomId(trimmed) ? trimmed : null;
}

module.exports = {
  generateRoomId,
  isValidRoomId,
  normalizeRoomId
};
