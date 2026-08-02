import type { INodeProperties } from 'n8n-workflow';

export const sportDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sport'],
			},
		},
		options: [
			{
				name: 'Get State',
				value: 'getState',
				action: 'Get sport state',
				description: 'Retrieve the current Sleeper season and week state for a sport',
			},
		],
		default: 'getState',
	},
	{
		displayName: 'Sport',
		name: 'sport',
		type: 'options',
		required: true,
		options: [
			{
				name: 'NFL',
				value: 'nfl',
			},
		],
		default: 'nfl',
		description: 'The Sleeper sport path value. This release supports NFL only.',
		displayOptions: {
			show: {
				resource: ['sport'],
				operation: ['getState'],
			},
		},
	},
];
