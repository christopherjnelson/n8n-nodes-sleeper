import type { INodeProperties } from 'n8n-workflow';

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
		placeholder: 'sleeperuser',
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
