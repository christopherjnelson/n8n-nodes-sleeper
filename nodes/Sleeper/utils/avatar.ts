import type { IDataObject } from 'n8n-workflow';

import type { SleeperAvatarSize } from './validation';

const SLEEPER_AVATAR_BASE_URL = 'https://sleepercdn.com/avatars';

export function createAvatarResult(avatarId: string, size: SleeperAvatarSize): IDataObject {
	const encodedAvatarId = encodeURIComponent(avatarId);
	const url =
		size === 'thumbnail'
			? `${SLEEPER_AVATAR_BASE_URL}/thumbs/${encodedAvatarId}`
			: `${SLEEPER_AVATAR_BASE_URL}/${encodedAvatarId}`;

	return {
		avatar_id: avatarId,
		size,
		url,
	};
}
