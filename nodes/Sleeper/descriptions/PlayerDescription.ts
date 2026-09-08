import type { INodeProperties } from 'n8n-workflow';

import { sleeperRoute } from './routing';
import { formatPlayerMap } from './response';

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
					"Retrieve Sleeper's keyed player map with server-side filters. Unfiltered data is about 5 MB; use it sparingly. No single-player endpoint is documented.",
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
				resource: ['player'],
				operation: ['getMany', 'getTrending'],
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
		type: 'string',
		default: '',
		placeholder: 'QB',
		description:
			'Optional Sleeper fantasy-position code, such as QB. This server-side filter reduces the player response size.',
		displayOptions: {
			show: {
				resource: ['player'],
				operation: ['getMany'],
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
		displayName: 'Output Mode',
		name: 'outputMode',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Single Map',
				value: 'singleMap',
				description: 'Return the complete raw object keyed by player ID as one n8n item',
			},
			{
				name: 'One Item per Player',
				value: 'splitItems',
				description:
					'Return one n8n item per player-map entry, adding the map key only when player_id is absent',
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
