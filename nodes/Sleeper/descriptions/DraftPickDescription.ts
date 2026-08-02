import type { INodeProperties } from 'n8n-workflow';

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
			'The stable Sleeper draft ID. Embedded pick metadata is preserved without player enrichment.',
		displayOptions: {
			show: {
				resource: ['draftPick'],
				operation: ['getMany'],
			},
		},
	},
];
