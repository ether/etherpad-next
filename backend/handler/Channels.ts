/**
 * Processes one task at a time per channel.
 */
class Channels {
  private readonly _exec: (ch:any, task:any) => any;
  private _promiseChains: Map<any, Promise<any>>;
  /**
   * @param {(ch, task) => any} [exec] - Task executor. If omitted, tasks are assumed to be
   *     functions that will be executed with the channel as the only argument.
   */
  constructor(exec: (ch:any, task:any) => any = (ch: string, task:any) => task(ch)) {
    this._exec = exec;
    this._promiseChains = new Map();
  }

  /**
   * Schedules a task for execution. The task will be executed once all previously enqueued tasks
   * for the named channel have completed.
   *
   * @param {any} ch - Identifies the channel.
   * @param {any} task - The task to give to the executor.
   * @returns {Promise<any>} The value returned by the executor.
   */
  async enqueue(ch:any, task:any): Promise<any> {
    const p = (this._promiseChains.get(ch) || Promise.resolve()).then(() => this._exec(ch, task));
    const pc = p
      .catch(() => {}) // Prevent rejections from halting the queue.
      .then(() => {
        // Clean up this._promiseChains if there are no more tasks for the channel.
        if (this._promiseChains.get(ch) === pc) this._promiseChains.delete(ch);
      });
    this._promiseChains.set(ch, pc);
    return await p;
  }
}
