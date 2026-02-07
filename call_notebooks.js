const { spawn } = require('child_process');

const bin = '/Users/dravilarx/.local/bin/notebooklm-mcp';
const child = spawn(bin, ['--stateless']);

let output = '';
child.stdout.on('data', (data) => {
    output += data.toString();
    // Look for the initialization response or the tool result
    try {
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.trim().startsWith('{')) {
                const json = JSON.parse(line);
                if (json.id === 1) {
                    // Initialized, now call tool
                    child.stdin.write(JSON.stringify({
                        jsonrpc: "2.0",
                        id: 2,
                        method: "tools/call",
                        params: {
                            name: "list_notebooks",
                            arguments: {}
                        }
                    }) + '\n');
                } else if (json.id === 2) {
                    console.log(JSON.stringify(json.result, null, 2));
                    child.kill();
                    process.exit(0);
                }
            }
        }
    } catch (e) {
        // Partial JSON, wait for more
    }
});

child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" }
    }
}) + '\n');

setTimeout(() => {
    console.error("Timeout waiting for MCP response");
    child.kill();
    process.exit(1);
}, 15000);
