import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { sleeperProperties } from './descriptions';

export class Sleeper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sleeper',
		name: 'sleeper',
		icon: { light: 'file:sleeper.png', dark: 'file:sleeper.dark.png' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Retrieve public Sleeper fantasy football and NFL state data without credentials',
		defaults: {
			name: 'Sleeper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		requestDefaults: {
			baseURL: 'https://api.sleeper.app/v1',
			headers: {
				Accept: 'application/json',
			},
			returnFullResponse: false,
		},
		properties: sleeperProperties,
	};
}
