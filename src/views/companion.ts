import { ItemView, WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE_COMPANION = 'companion-view';

export class CompanionView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_COMPANION;
  }

  getDisplayText() {
    return 'Obsidian Companion';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl('h4', { text: 'Obsidian Companion' });
    const button = container.createEl("button", {
      text: "Submit",
      attr: {type: "submit"}
    });

    button.addEventListener("click", () => {
      console.log('hola!');
    });
  }

  async onClose() {
    // Nothing to clean up.
  }
}