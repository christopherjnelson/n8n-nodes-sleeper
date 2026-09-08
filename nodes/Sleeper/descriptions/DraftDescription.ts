import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';

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
				description: 'Retrieve one public Sleeper draft by its opaque draft ID',
				routing: sleeperRoute('=/draft/{{encodeURIComponent(String($parameter.draftId).trim())}}'),
			},
			{
				name: 'Get Many for League',
				value: 'getManyForLeague',
				action: 'Get many drafts for a league',
				description: 'Retrieve all public drafts associated with a Sleeper league',
				routing: sleeperRoute(
					'=/league/{{encodeURIComponent(String($parameter.leagueId).trim())}}/drafts',
				),
			},
			{
				name: 'Get Many for User',
				value: 'getManyForUser',
				action: 'Get many drafts for a user',
				description: "Retrieve a user's public drafts for an NFL season using a stable user ID",
				routing: sleeperRoute(
					'=/user/{{encodeURIComponent(String($parameter.userId).trim())}}/drafts/{{$parameter.sport}}/{{String($parameter.season).trim()}}',
				),
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
		description: 'The exact opaque Sleeper draft ID, handled as text to preserve every digit',
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
		description:
			'The exact opaque Sleeper league ID. All drafts returned by Sleeper are preserved.',
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
