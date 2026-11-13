/**
 * Progress reporter shared by the three broadcast commands (`bc`, `obc`, `rbc`).
 *
 * Each command used to own a `setInterval` that edited the reply every few
 * seconds and cleared itself when the counter reached the target. A broadcast
 * that never reached its target (a member leaving mid-run, a Discord hiccup)
 * left that interval editing a message forever.
 *
 * The scheduler version is cancellable in both directions:
 *   - the job stops itself when `isDone()` turns true, and
 *   - a one-shot timeout tears it down after `timeoutMs`.
 * Both halves are removed together, so nothing is left in the job table.
 */
const { getScheduler } = require('../../src/shared/runtime/scheduler');

/**
 * @param {object} opts
 * @param {object} opts.interaction      the slash-command interaction being edited
 * @param {import('discord.js').EmbedBuilder} opts.statusEmbed
 * @param {import('discord.js').EmbedBuilder} opts.logEmbed
 * @param {() => boolean} opts.isDone    true once every target has been handled
 * @param {() => string} opts.describe   builds the live progress description
 * @param {string} opts.doneNote         appended to the log embed on completion
 * @param {number} [opts.intervalMs]     how often to edit the reply
 * @param {number} [opts.timeoutMs]      hard stop for a broadcast that stalls
 */
function reportBroadcastProgress({
  interaction,
  statusEmbed,
  logEmbed,
  isDone,
  describe,
  doneNote,
  intervalMs = 3000,
  timeoutMs = 15 * 60 * 1000,
}) {
  const scheduler = getScheduler();
  const scope = `interaction:${interaction.id}`;
  const jobName = `broadcast-${interaction.id}`;

  const finish = (note) => {
    scheduler.stop(jobName, scope);
    scheduler.stop(`${jobName}-timeout`, scope);
    if (note) logEmbed.setDescription(`${logEmbed.description || ''}${note}`);
    interaction.editReply({ embeds: [statusEmbed, logEmbed] }).catch(() => {});
  };

  const job = scheduler.every(
    intervalMs,
    () => {
      statusEmbed.setDescription(describe());
      interaction.editReply({ embeds: [statusEmbed, logEmbed] }).catch(() => {});
      if (isDone()) finish(`\n${doneNote}\n`);
    },
    { name: jobName, scope },
  );

  scheduler.after(timeoutMs, () => finish(null), {
    name: `${jobName}-timeout`,
    scope,
  });

  return job;
}

module.exports = { reportBroadcastProgress };
