// One in-app prompt for every question the app has to ask before proceeding. Mount a
// single ConfirmDialog high in the tree and any code below can ask without owning a
// modal of its own. Requests queue rather than overlap: two prompts racing in one modal
// would leave the second answered by a click meant for the first.

export interface DialogChoice<Id extends string = string> {
  id: Id
  label: string
  // Set on the answer to reach for, so it reads as the default without being the one a
  // stray Escape picks.
  tone?: `accent` | `danger`
}

export interface DialogRequest {
  title: string
  message: string
  choices: DialogChoice[]
  // Answer used when the dialog is dismissed rather than answered (Escape, a click on
  // the backdrop). Always the safe one: dismissing is not consent.
  dismiss_id: string
  resolve: (id: string) => void
}

// Questions waiting for an answer, oldest first. Only the head is on screen.
export const dialog_queue = $state<DialogRequest[]>([])

export const request_choice = <Id extends string>(
  message: string,
  title: string,
  choices: DialogChoice<Id>[],
  dismiss_id: Id,
): Promise<Id> =>
  new Promise<Id>((resolve) => {
    dialog_queue.push({
      title,
      message,
      choices,
      dismiss_id,
      // The queue is heterogeneous, so it holds the widened `string` form. Only a
      // choice's own id or `dismiss_id` ever comes back, and both are `Id`.
      resolve: (id: string) => resolve(id as Id),
    })
  })

// Resolves the request on screen. A no-op once the queue is empty, which is what keeps
// the dialog's own close from answering the next question.
export const answer_dialog = (id: string): void => {
  dialog_queue.shift()?.resolve(id)
}

// Safely settle queued callers when their dialog host is torn down.
export const dismiss_all_dialogs = (): void => {
  for (const request of dialog_queue.splice(0)) request.resolve(request.dismiss_id)
}

export const ask_confirm = async (
  message: string,
  title: string,
  confirm_label = `OK`,
): Promise<boolean> =>
  (await request_choice(
    message,
    title,
    [
      { id: `cancel`, label: `Cancel` },
      { id: `ok`, label: confirm_label, tone: `accent` },
    ],
    `cancel`,
  )) === `ok`
