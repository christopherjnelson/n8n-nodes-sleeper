import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';

export const rosterDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['roster'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many rosters',
				description: 'Retrieve all raw roster records in a league without joining league users',
				routing: sleeperRoute(
					'=/league/{{encodeURIComponent(String($parameter.leagueId).trim())}}/rosters',
				),
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
		description: 'The exact opaque Sleeper league ID, handled as text to preserve every digit',
		displayOptions: {
			show: {
				resource: ['roster'],
				operation: ['getMany'],
			},
		},
	},
];
