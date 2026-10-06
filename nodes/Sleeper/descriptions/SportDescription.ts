import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';
import { sportOptionsForCapability } from '../utils/sports';

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
				description: 'Retrieve the current Sleeper season and week state for NFL, NBA, or NHL',
				routing: sleeperRoute('=/state/{{$parameter.sport}}'),
			},
		],
		default: 'getState',
	},
	{
		displayName: 'Sport',
		name: 'sport',
		type: 'options',
		required: true,
		options: sportOptionsForCapability('state'),
		default: 'nfl',
		description: 'The sport state fields returned by Sleeper vary by sport',
		displayOptions: {
			show: {
				resource: ['sport'],
				operation: ['getState'],
			},
		},
	},
];
