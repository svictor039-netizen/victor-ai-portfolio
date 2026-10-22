/**
 * Доказательство runtime-доступа: серверный MCP-клиент сайта (не Claude Code)
 * читает оба канала Catch_Job_4Me. Только чтение, ничего не пишет в БД.
 * Запуск: node --import tsx scripts/catch-job-mcp-probe.mjs
 */
import { McpClient, safeError } from '../src/lib/catch-job/mcp-client.ts';

const CHANNELS = ['job_developer', 'kwork_birzha'];
const client = new McpClient();

try {
  const init = await client.initialize();
  console.log(`initialize: ${init.serverName} ${init.serverVersion}, protocol ${init.protocolVersion}, host ${client.host}`);
  console.log(`tools/list: ${(await client.listTools()).join(', ')}`);
  for (const channel of CHANNELS) {
    const info = await client.getChannelInfo(channel);
    const posts = await client.getLatestPosts(channel, 5);
    console.log(`\n@${channel}: «${info.data.title}», ${info.data.subscriberCount}`);
    for (const p of posts.data) {
      const firstLine = p.text.split('\n').find((l) => l.trim()) ?? '';
      console.log(`  #${p.id} ${p.timestamp} ${firstLine.slice(0, 70)}`);
    }
  }
  console.log(`\nВызовов JSON-RPC: ${client.calls}`);
} catch (err) {
  console.error('Ошибка:', safeError(err));
  process.exitCode = 1;
}
