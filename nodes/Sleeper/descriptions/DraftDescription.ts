import type { INodeProperties } from 'n8n-workflow';

export const draftDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['draft'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a draft',
				description: 'Retrieve one public Sleeper draft by its stable draft ID',
			},
			{
				name: 'Get Many for League',
				value: 'getManyForLeague',
				action: 'Get many drafts for a league',
				description: 'Retrieve all public drafts associated with a Sleeper league',
			},
			{
				name: 'Get Many for User',
				value: 'getManyForUser',
				action: 'Get many drafts for a user',
				description: "Retrieve a user's public drafts for an NFL season using a stable user ID",
			},
		],
		default: 'get',
	},
	{
		displayName: 'Draft ID',
		name: 'draftId',
		type: 'string',
		required: true,
		default: '',
		description: 'The stable Sleeper draft ID. IDs are handled as strings to preserve every digit.',
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'League ID',
		name: 'leagueId',
		type: 'string',
		required: true,
		default: '',
		description: 'The stable Sleeper league ID. All drafts returned by Sleeper are preserved.',
		displayOptions: {
			show: {
				resource: ['draft'],
				operation: ['getManyForLeague'],
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
				resource: ['draft'],
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
				resource: ['draft'],
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
				resource: ['draft'],
				operation: ['getManyForUser'],
			},
		},
	},
];
