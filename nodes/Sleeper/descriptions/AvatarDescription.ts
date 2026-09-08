import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';
import { formatAvatarUrl } from './response';

export const avatarDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['avatar'],
			},
		},
		options: [
			{
				name: 'Get URL',
				value: 'getUrl',
				action: 'Get an avatar URL',
				description:
					'Validate and return a documented Sleeper CDN avatar URL without downloading the image body',
				routing: sleeperRoute(
					`={{ 'https://sleepercdn.com/avatars/' + ($parameter.imageSize === 'thumbnail' ? 'thumbs/' : '') + encodeURIComponent(String($parameter.avatarId).trim()) }}`,
					{ method: 'HEAD', postReceive: [formatAvatarUrl] },
				),
			},
		],
		default: 'getUrl',
	},
	{
		displayName: 'Avatar ID',
		name: 'avatarId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The exact avatar ID from a Sleeper user or league object. Sleeper is contacted to verify that the image exists.',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getUrl'],
			},
		},
	},
	{
		displayName: 'Image Size',
		name: 'imageSize',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Full Size',
				value: 'full',
			},
			{
				name: 'Thumbnail',
				value: 'thumbnail',
			},
		],
		default: 'full',
		description: 'Whether to construct the documented full-size or thumbnail CDN URL',
		displayOptions: {
			show: {
				resource: ['avatar'],
				operation: ['getUrl'],
			},
		},
	},
];
