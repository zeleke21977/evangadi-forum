import { safeExecute } from '../../../db/config.js';
import { BadRequestError, NotFoundError } from '../../utils/errors/index.js';

const mapProfile = row => ({
  id: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  avatar: row.avatar,
});

export const getProfileService = async userId => {
  const rows = await safeExecute('SELECT user_id, first_name, last_name, email, avatar FROM users WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows.length) throw new NotFoundError('Profile not found.');
  return mapProfile(rows[0]);
};

export const updateProfileService = async (userId, { firstName, lastName, email, avatar }) => {
  if (avatar !== null && avatar !== undefined && avatar !== '' && !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(avatar)) {
    throw new BadRequestError('Choose a valid PNG, JPG, WEBP, or GIF profile image.');
  }
  if (avatar && avatar.length > 2_800_000) throw new BadRequestError('Profile images must be smaller than 2 MB.');
  try {
    const savedAvatar = avatar === undefined ? (await getProfileService(userId)).avatar : (avatar || null);
    await safeExecute('UPDATE users SET first_name = ?, last_name = ?, email = ?, avatar = ? WHERE user_id = ?', [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), savedAvatar, userId]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new BadRequestError('That email address is already in use.');
    throw error;
  }
  return getProfileService(userId);
};
