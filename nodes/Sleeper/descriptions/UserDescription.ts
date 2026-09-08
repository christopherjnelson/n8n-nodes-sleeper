import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';

export const userDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a user',
				description: 'Retrieve a Sleeper user by username or stable user ID',
				routing: sleeperRoute(
					'=/user/{{encodeURIComponent(String($parameter.usernameOrUserId).trim())}}',
				),
			},
		],
		default: 'get',
	},
	{
		displayName: 'Username or User ID',
		name: 'usernameOrUserId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'replace-with-username-or-user-ID',
		description:
			'A Sleeper username or stable user ID. Usernames can change; retain the returned user_id for future workflow use.',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
	},
];
