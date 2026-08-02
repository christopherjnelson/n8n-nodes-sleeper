import type { INodeProperties } from 'n8n-workflow';

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
					'Construct a fixed Sleeper CDN avatar URL locally without requesting or downloading the image',
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
			'The exact avatar ID from a Sleeper user or league object. The node does not verify that the image exists.',
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
