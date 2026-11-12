#!/usr/bin/env node
// mcp-server.mjs — Local Stdio MCP server for e2_panel development.
// Communicates via newline-delimited JSON-RPC 2.0 over stdin/stdout with zero external dependencies.

import { createInterface } from 'node:readline';
import { createDiskStore, handleJsonRpcMessage } from './mcp-tools.mjs';

const store = createDiskStore();

const rl = createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const parseErr = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    };
    process.stdout.write(JSON.stringify(parseErr) + '\n');
    return;
  }

  const response = handleJsonRpcMessage(parsed, store);
  if (response !== null) {
    process.stdout.write(JSON.stringify(response) + '\n');
  }
});
