import type { INodeProperties } from 'n8n-workflow';

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
				description: 'Retrieve one Sleeper league by its stable league ID',
			},
			{
				name: 'Get Many for User',
				value: 'getManyForUser',
				action: 'Get many leagues for a user',
				description: 'Retrieve all leagues for a stable user ID, sport, and season',
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
		description:
			'The stable Sleeper league ID. IDs are handled as strings to preserve every digit.',
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
