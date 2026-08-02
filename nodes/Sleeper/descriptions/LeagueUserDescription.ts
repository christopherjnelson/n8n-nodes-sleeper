import type { INodeProperties } from 'n8n-workflow';

export const leagueUserDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['leagueUser'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many league users',
				description:
					'Retrieve users participating in a league. Roster ownership is returned separately by Roster → Get Many.',
			},
		],
		default: 'getMany',
	},
	{
		displayName: 'League ID',
		name: 'leagueId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The stable Sleeper league ID. IDs are handled as strings to preserve every digit.',
		displayOptions: {
			show: {
				resource: ['leagueUser'],
				operation: ['getMany'],
			},
		},
	},
];
