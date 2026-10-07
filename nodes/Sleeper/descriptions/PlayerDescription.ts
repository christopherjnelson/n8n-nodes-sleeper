import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';
import { formatPlayerMap } from './response';
import { sportOptionsForCapability } from '../utils/sports';
import { nbaPlayerPositionOptions, nflPlayerPositionOptions } from '../utils/playerPositions';

export const playerDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['player'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many players',
				description:
					"Retrieve Sleeper's keyed player map. Active Only and Position are sent to Sleeper; Player Options filter and shape the downloaded response locally. Unfiltered data is about 5 MB; local controls reduce saved output, not the API download. No single-player endpoint is documented.",
				routing: sleeperRoute('=/players/{{$parameter.sport}}', {
					postReceive: [formatPlayerMap],
				}),
			},
			{
				name: 'Get Trending',
				value: 'getTrending',
				action: 'Get trending players',
				description:
					'Retrieve raw player IDs and counts. Sleeper requires attribution when displaying or republishing them.',
				routing: sleeperRoute('=/players/{{$parameter.sport}}/trending/{{$parameter.trendType}}'),
			},
		],
		default: 'getMany',
	},
	{
		displayName: 'Sport',
		name: 'sport',
		type: 'options',
		required: true,
		options: sportOptionsForCapability('playerCatalog'),
		default: 'nfl',
		description: 'Choose NFL, NBA, or NHL for the player catalog',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Sport',
		name: 'sport',
		type: 'options',
		required: true,
		options: sportOptionsForCapability('trending'),
		default: 'nfl',
		description: 'Choose NFL or NBA. Sleeper NHL trending support has not been established.',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getTrending'],
			},
		},
	},
	{
		displayName: 'Active Only',
		name: 'activeOnly',
		type: 'boolean',
		default: true,
		description:
			'Whether to request only active players using the server-side active=true filter. Disabling this can return the complete player dataset, which averages approximately 5 MB.',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getMany'],
			},
		},
		routing: {
			request: {
				qs: {
					active: '={{$value ? true : undefined}}',
				},
			},
		},
	},
	{
		displayName: 'Position',
		name: 'position',
		type: 'options',
		options: nflPlayerPositionOptions,
		default: '',
		description:
			'Optional NFL fantasy-position filter. Sleeper matches fantasy_positions, including multi-position players.',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getMany'],
				sport: ['nfl'],
			},
		},
		routing: {
			request: {
				qs: {
					position: '={{$value.trim() || undefined}}',
				},
			},
		},
	},
	{
		displayName: 'Position',
		name: 'position',
		type: 'options',
		options: nbaPlayerPositionOptions,
		default: '',
		description:
			'Optional NBA fantasy-position filter. Sleeper matches fantasy_positions, including multi-position players.',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getMany'],
				sport: ['nba'],
			},
		},
		routing: {
			request: {
				qs: {
					position: '={{$value.trim() || undefined}}',
				},
			},
		},
	},
	{
		displayName: 'Position',
		name: 'position',
		type: 'hidden',
		default: '',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getMany'],
				sport: ['nhl'],
			},
		},
	},
	{
		displayName: 'NHL Position Filtering',
		name: 'nhlPositionNotice',
		type: 'notice',
		default:
			'Sleeper returned no players for tested NHL position filters. Position is hidden for NHL; clear any saved Position value before running.',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getMany'],
				sport: ['nhl'],
			},
		},
	},
	{
		displayName: 'Player Options',
		name: 'playerOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Team',
				name: 'team',
				type: 'string',
				default: '',
				description: 'Exact team code match, ignoring case and surrounding spaces',
			},
			{
				displayName: 'Has Team',
				name: 'hasTeam',
				type: 'boolean',
				default: false,
				description: 'Whether to keep only players with a nonempty team value',
			},
			{
				displayName: 'Player IDs',
				name: 'playerIds',
				type: 'string',
				default: '',
				placeholder: '123, 456',
				description: 'Comma-separated exact player-map IDs',
			},
			{
				displayName: 'Output Fields',
				name: 'outputFields',
				type: 'string',
				default: '',
				placeholder: 'full_name, team, position',
				description:
					'Comma-separated flat fields; blank keeps all fields. player_id is always included.',
			},
		],
		displayOptions: { show: { resource: ['player'], operation: ['getMany'] } },
	},
	{
		displayName: 'Output Mode',
		name: 'outputMode',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Single Map',
				value: 'singleMap',
				description: 'Return one object keyed by player ID as one n8n item',
			},
			{
				name: 'One Item per Player',
				value: 'splitItems',
				description:
					'Return one item per matching player, preserving all fields by default and adding the map key when player_id is empty',
			},
		],
		default: 'singleMap',
		description:
			'How to emit the keyed player map. Splitting a complete response can create thousands of n8n items.',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getMany'],
			},
		},
	},
	{
		displayName: 'Local Processing Notice',
		name: 'playerLocalProcessingNotice',
		type: 'notice',
		default:
			'The player catalog is downloaded before these local filters and output controls run. They reduce saved workflow output, not the API download.',
		displayOptions: { show: { resource: ['player'], operation: ['getMany'] } },
	},
	{
		displayName: 'Sort By',
		name: 'sortBy',
		type: 'options',
		default: '',
		options: [
			{ name: 'Full Name', value: 'full_name' },
			{ name: 'None', value: '' },
			{ name: 'Player ID', value: 'player_id' },
			{ name: 'Position', value: 'position' },
			{ name: 'Team', value: 'team' },
		],
		description: 'Local sort order for One Item per Player output',
		displayOptions: {
			show: { resource: ['player'], operation: ['getMany'], outputMode: ['splitItems'] },
		},
	},
	{
		displayName: 'Sort Direction',
		name: 'sortDirection',
		type: 'options',
		default: 'asc',
		options: [
			{ name: 'Ascending', value: 'asc' },
			{ name: 'Descending', value: 'desc' },
		],
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getMany'],
				outputMode: ['splitItems'],
				sortBy: ['full_name', 'team', 'position', 'player_id'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['player'], operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1, numberStepSize: 1 },
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['player'], operation: ['getMany'], returnAll: [false] } },
	},
	{
		displayName: 'Trend Type',
		name: 'trendType',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Adds',
				value: 'add',
			},
			{
				name: 'Drops',
				value: 'drop',
			},
		],
		default: 'add',
		description: 'Whether to retrieve players trending through adds or drops',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getTrending'],
			},
		},
	},
	{
		displayName: 'Lookback Hours',
		name: 'lookbackHours',
		type: 'number',
		required: true,
		default: 24,
		typeOptions: {
			minValue: 1,
			numberStepSize: 1,
		},
		description: 'How many hours of Sleeper add or drop activity to include',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getTrending'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'lookback_hours',
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'resultLimit',
		type: 'number',
		required: true,
		default: 25,
		typeOptions: {
			minValue: 1,
			numberStepSize: 1,
		},
		description: 'How many raw trending records to request from Sleeper',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getTrending'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
		},
	},
	{
		displayName:
			'Sleeper requires attribution when you display or republish its trending-player data.',
		name: 'trendingAttribution',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getTrending'],
			},
		},
	},
];
