import type { INodeProperties } from 'n8n-workflow';

export const draftTradedPickDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['draftTradedPick'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many draft traded picks',
				description:
					'Retrieve raw traded-pick ownership records scoped to a specific public Sleeper draft',
			},
		],
		default: 'getMany',
	},
	{
		displayName: 'Draft ID',
		name: 'draftId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The exact opaque Sleeper draft ID. Use Traded Pick → Get Many for league-scoped records.',
		displayOptions: {
			show: {
				resource: ['draftTradedPick'],
				operation: ['getMany'],
			},
		},
	},
];
