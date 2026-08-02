const assert = require('node:assert/strict');
const test = require('node:test');

const packageMetadata = require('../package.json');
const nodeMetadata = require('../nodes/Sleeper/Sleeper.node.json');

test('registers the version 1 Sleeper node without credentials', () => {
	assert.equal(packageMetadata.name, 'n8n-nodes-sleeper');
	assert.deepEqual(packageMetadata.n8n.credentials, []);
	assert.deepEqual(packageMetadata.n8n.nodes, ['dist/nodes/Sleeper/Sleeper.node.js']);
	assert.equal(nodeMetadata.node, 'n8n-nodes-sleeper');
	assert.equal(nodeMetadata.nodeVersion, '1.0');
});
