import type { INodeProperties } from 'n8n-workflow';

export const matchupDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['matchup'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many matchups',
				description:
					'Retrieve one raw record per roster side for a league week. Opponents sharing a matchup ID are not paired.',
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
				resource: ['matchup'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Week',
		name: 'week',
		type: 'number',
		required: true,
		default: 1,
		typeOptions: {
			minValue: 1,
			numberStepSize: 1,
		},
		description:
			'The league week to retrieve. Sleeper returns one record per roster side; records sharing a matchup_id are not combined.',
		displayOptions: {
			show: {
				resource: ['matchup'],
				operation: ['getMany'],
			},
		},
	},
];
