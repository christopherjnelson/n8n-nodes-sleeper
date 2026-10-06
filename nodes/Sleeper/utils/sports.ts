import type { INodePropertyOptions } from 'n8n-workflow';

import type { SleeperSport } from './validation';

export type SleeperSportCapability = 'seasonalListings' | 'playerCatalog' | 'trending' | 'state';

const supportedSports: Record<SleeperSportCapability, readonly SleeperSport[]> = {
	seasonalListings: ['nfl', 'nba'],
	playerCatalog: ['nfl', 'nba', 'nhl'],
	trending: ['nfl', 'nba'],
	state: ['nfl', 'nba', 'nhl'],
};

const sportLabels: Record<SleeperSport, string> = {
	nfl: 'NFL',
	nba: 'NBA',
	nhl: 'NHL',
};

export function sportsForCapability(capability: SleeperSportCapability): readonly SleeperSport[] {
	return supportedSports[capability];
}

export function sportOptionsForCapability(
	capability: SleeperSportCapability,
): INodePropertyOptions[] {
	return supportedSports[capability].map((value) => ({ name: sportLabels[value], value }));
}

export function sportCapabilityForOperation(
	resource: string,
	operation: string,
): SleeperSportCapability | undefined {
	if ((resource === 'league' || resource === 'draft') && operation === 'getManyForUser') {
		return 'seasonalListings';
	}
	if (resource === 'player' && operation === 'getMany') return 'playerCatalog';
	if (resource === 'player' && operation === 'getTrending') return 'trending';
	if (resource === 'sport' && operation === 'getState') return 'state';
	return undefined;
}
