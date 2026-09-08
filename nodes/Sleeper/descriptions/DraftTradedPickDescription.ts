import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';

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
				routing: sleeperRoute(
					'=/draft/{{encodeURIComponent(String($parameter.draftId).trim())}}/traded_picks',
				),
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
