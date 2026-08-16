/**
 * Model-visible guidance for `cursor_agent`. Registered through the official
 * `systemPrompt.section` API so it is part of the assembled system prompt
 * already written to the session log. Do not invent a new session event.
 */
/** When the parent model should call `cursor_agent`, and what to put in the prompt. */
export const CURSOR_AGENT_WHEN_TO_USE = [
    'When the user asks you to have Cursor implement, review, or otherwise do a standalone coding job, call cursor_agent.',
    'The current chat stays in DeepSeek Harness; the job runs in the Cursor CLI already signed in on this machine.',
    'This is not a way to pick a Cursor model for the current chat.',
    'Give cursor_agent a complete, self-contained prompt: the child does not see this conversation.',
    'Include the goal, relevant file paths, and what done looks like.',
    'Do not call cursor_agent for small questions you can answer here.',
].join(' ');
