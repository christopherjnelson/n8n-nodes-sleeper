import type { INodeProperties } from 'n8n-workflow';

export const transactionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['transaction'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many transactions',
				description: 'Retrieve raw free-agent, waiver, and trade transactions for a Sleeper round',
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
				resource: ['transaction'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Round or Week',
		name: 'round',
		type: 'number',
		required: true,
		default: 1,
		typeOptions: {
			minValue: 1,
			numberStepSize: 1,
		},
		description:
			"Sleeper's round path parameter. For NFL leagues this commonly corresponds to the week; the current week is not selected automatically.",
		displayOptions: {
			show: {
				resource: ['transaction'],
				operation: ['getMany'],
			},
		},
	},
];
