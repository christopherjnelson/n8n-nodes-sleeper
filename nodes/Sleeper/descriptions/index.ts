import type { INodeProperties } from 'n8n-workflow';

import { leagueDescription } from './LeagueDescription';
import { leagueUserDescription } from './LeagueUserDescription';
import { matchupDescription } from './MatchupDescription';
import { playoffDescription } from './PlayoffDescription';
import { rosterDescription } from './RosterDescription';
import { sportDescription } from './SportDescription';
import { tradedPickDescription } from './TradedPickDescription';
import { transactionDescription } from './TransactionDescription';
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
				name: 'League User',
				value: 'leagueUser',
			},
			{
				name: 'Matchup',
				value: 'matchup',
			},
			{
				name: 'Playoff',
				value: 'playoff',
			},
			{
				name: 'Roster',
				value: 'roster',
			},
			{
				name: 'Sport',
				value: 'sport',
			},
			{
				name: 'Traded Pick',
				value: 'tradedPick',
			},
			{
				name: 'Transaction',
				value: 'transaction',
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
	...leagueUserDescription,
	...matchupDescription,
	...playoffDescription,
	...rosterDescription,
	...sportDescription,
	...tradedPickDescription,
	...transactionDescription,
];
