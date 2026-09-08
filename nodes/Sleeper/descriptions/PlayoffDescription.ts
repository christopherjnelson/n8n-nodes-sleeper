import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';

export const playoffDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['playoff'],
			},
		},
		options: [
			{
				name: 'Get Bracket',
				value: 'getBracket',
				action: 'Get a playoff bracket',
				description:
					'Retrieve raw playoff matchup records, including source-match winner or loser references when present',
				routing: sleeperRoute(
					`=/league/{{encodeURIComponent(String($parameter.leagueId).trim())}}/{{$parameter.bracketType === 'winners' ? 'winners_bracket' : 'losers_bracket'}}`,
				),
			},
		],
		default: 'getBracket',
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
				resource: ['playoff'],
				operation: ['getBracket'],
			},
		},
	},
	{
		displayName: 'Bracket Type',
		name: 'bracketType',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Winners',
				value: 'winners',
			},
			{
				name: 'Losers',
				value: 'losers',
			},
		],
		default: 'winners',
		description:
			'Whether to retrieve the winners or losers bracket. Records can contain w, l, t1_from, and t2_from references.',
		displayOptions: {
			show: {
				resource: ['playoff'],
				operation: ['getBracket'],
			},
		},
	},
];
