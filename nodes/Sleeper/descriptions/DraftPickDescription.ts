import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';

export const draftPickDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['draftPick'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many draft picks',
				description: 'Retrieve every recorded raw pick from a public Sleeper draft',
				routing: sleeperRoute(
					'=/draft/{{encodeURIComponent(String($parameter.draftId).trim())}}/picks',
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
			'The exact opaque Sleeper draft ID. Embedded pick metadata is preserved without enrichment.',
		displayOptions: {
			show: {
				resource: ['draftPick'],
				operation: ['getMany'],
			},
		},
	},
];
