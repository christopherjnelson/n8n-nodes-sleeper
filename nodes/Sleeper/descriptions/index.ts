import type { INodeProperties } from 'n8n-workflow';

import { avatarDescription } from './AvatarDescription';
import { draftDescription } from './DraftDescription';
import { draftPickDescription } from './DraftPickDescription';
import { draftTradedPickDescription } from './DraftTradedPickDescription';
import { leagueDescription } from './LeagueDescription';
import { leagueUserDescription } from './LeagueUserDescription';
import { matchupDescription } from './MatchupDescription';
import { playerDescription } from './PlayerDescription';
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
				name: 'Avatar',
				value: 'avatar',
			},
			{
				name: 'Draft',
				value: 'draft',
			},
			{
				name: 'Draft Pick',
				value: 'draftPick',
			},
			{
				name: 'Draft Traded Pick',
				value: 'draftTradedPick',
			},
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
				name: 'Player',
				value: 'player',
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
	...avatarDescription,
	...draftDescription,
	...draftPickDescription,
	...draftTradedPickDescription,
	...userDescription,
	...leagueDescription,
	...leagueUserDescription,
	...matchupDescription,
	...playerDescription,
	...playoffDescription,
	...rosterDescription,
	...sportDescription,
	...tradedPickDescription,
	...transactionDescription,
];
