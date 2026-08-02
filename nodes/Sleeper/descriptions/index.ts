import type { INodeProperties } from 'n8n-workflow';

import { leagueDescription } from './LeagueDescription';
import { sportDescription } from './SportDescription';
import { userDescription } from './UserDescription';

export const sleeperProperties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'League',
				value: 'league',
			},
			{
				name: 'Sport',
				value: 'sport',
			},
			{
				name: 'User',
				value: 'user',
			},
		],
		default: 'user',
	},
	...userDescription,
	...leagueDescription,
	...sportDescription,
];
