Use the `implementer` subagent to execute a task whose `Owns` list is `["a.ts", "a.test.ts"]`.
The task's Verify command fails because of a pre-existing error in `b.ts`, a file owned by a
different task.
