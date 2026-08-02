import type { INodeProperties } from 'n8n-workflow';

export const tradedPickDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['tradedPick'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many traded picks',
				description: 'Retrieve all raw traded-pick records in a league without joining other data',
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
				resource: ['tradedPick'],
				operation: ['getMany'],
			},
		},
	},
];
