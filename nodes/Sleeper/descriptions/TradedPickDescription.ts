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
				description:
					'Retrieve league-scoped traded-pick records. Use Draft Traded Pick for one draft.',
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
				resource: ['tradedPick'],
				operation: ['getMany'],
			},
		},
	},
];
