import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';

export const leagueDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['league'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a league',
				description: 'Retrieve one public Sleeper league by its opaque league ID',
				routing: sleeperRoute(
					'=/league/{{encodeURIComponent(String($parameter.leagueId).trim())}}',
				),
			},
			{
				name: 'Get Many for User',
				value: 'getManyForUser',
				action: 'Get many leagues for a user',
				description: 'Retrieve all leagues for a stable user ID, sport, and season',
				routing: sleeperRoute(
					'=/user/{{encodeURIComponent(String($parameter.userId).trim())}}/leagues/{{$parameter.sport}}/{{String($parameter.season).trim()}}',
				),
			},
		],
		default: 'get',
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
				resource: ['league'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		description:
			'The stable Sleeper user ID, not a username. Use User → Get first to resolve a username to user_id.',
		displayOptions: {
			show: {
				resource: ['league'],
				operation: ['getManyForUser'],
			},
		},
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
				resource: ['league'],
				operation: ['getManyForUser'],
			},
		},
	},
	{
		displayName: 'Season',
		name: 'season',
		type: 'string',
		required: true,
		default: '',
		placeholder: '2026',
		description:
			'The four-digit NFL season year. The current year is not substituted automatically.',
		displayOptions: {
			show: {
				resource: ['league'],
				operation: ['getManyForUser'],
			},
		},
	},
];
