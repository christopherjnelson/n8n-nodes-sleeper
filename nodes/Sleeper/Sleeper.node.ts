import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class Sleeper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sleeper',
		name: 'sleeper',
		icon: { light: 'file:sleeper.svg', dark: 'file:sleeper.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: 'Early development',
		description:
			'Retrieve public Sleeper fantasy football league, roster, matchup, transaction, draft, and player data',
		defaults: {
			name: 'Sleeper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Operations are not available in this development scaffold',
				name: 'developmentNotice',
				type: 'notice',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.getInputData()];
	}
}
