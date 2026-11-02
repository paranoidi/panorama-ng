import { setGroupId, getGroupId } from './tabs.js';
import {
  groupNodes, makeGroupNode, resizeGroups, updateGroupFit, insertTab, activateTiling,
} from './groupNodes.js';
import * as groups from './groups.js';
import { newElement } from '../_share/utils.js';

let dragTabs = []; // dragged tab plus any ctrl-selected tabs, in DOM order
let dragOverTab = null;
let dragCount = 0;
let dragDropBefore;
let dragIndicator;

let newGroupDrop;

export function createDragIndicator() {
  dragIndicator = newElement('div', { class: 'drag_indicator' });
  return dragIndicator;
}

export async function tabMoved(tabId, moveInfo) {
  const windowId = (await browser.windows.getCurrent()).id;
  if (windowId === moveInfo.windowId) {
    browser.tabs.get(tabId).then(async (tab) => {
      await insertTab(tab);
      groups.forEach(async (group) => {
        updateGroupFit(group);
      });
    });
  }
}

export function tabDragStart(e) {
  if (this.classList.contains('pinned')) {
    e.preventDefault();
    return;
  }

  this.classList.add('drag');

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', 'pvDragging');

  const rect = this.getBoundingClientRect();

  e.dataTransfer.setDragImage(this, rect.width / 2, rect.height / 2);

  dragTabs = this.classList.contains('multi')
    ? [...document.querySelectorAll('.tab.multi')]
    : [this];
  dragTabs.forEach((t) => t.classList.add('drag'));
  newGroupDrop.classList.add('show');
}

function clearMultiSelection() {
  document.querySelectorAll('.tab.multi').forEach((t) => t.classList.remove('multi'));
}

// Move tabId directly before/after toTabId in the real tab strip
async function moveTabNextTo(tabId, toTabId, before) {
  const tab = await browser.tabs.get(tabId);
  const toTab = await browser.tabs.get(toTabId);

  let toIndex = toTab.index;
  if (tab.index < toTab.index) {
    if (before) toIndex -= 1;
  } else if (!before) {
    toIndex += 1;
  }

  await browser.tabs.move(tabId, { index: toIndex });
}

export function tabDragEnter(e) {
  e.preventDefault();

  if (dragOverTab && this !== dragOverTab) {
    dragIndicator.classList.remove('show');
    dragOverTab = this;
  }

  if (dragCount === 0) {
    dragOverTab = this;
  }
  dragCount += 1;
}

export function tabDragLeave(e) {
  e.preventDefault();

  dragCount -= 1;
  if (dragCount === 0) {
    dragIndicator.classList.remove('show');
    dragOverTab = null;
  }
}

export function tabDragOver(e) {
  e.preventDefault();

  e.dataTransfer.dropEffect = 'move'; // See the section on the DataTransfer object.

  if (dragOverTab && !dragTabs.includes(dragOverTab)) {
    const rect = dragOverTab.getBoundingClientRect();

    dragIndicator.classList.add('show');
    dragIndicator.style.height = `${rect.height - 8}px`;
    dragIndicator.style.top = `${window.scrollY + rect.top}px`;

    if (e.clientX < rect.left + (rect.width / 2)) {
      dragIndicator.style.left = `${rect.left - 5}px`;
      dragDropBefore = true;
    } else {
      dragIndicator.style.left = `${rect.left + rect.width - 5}px`;
      dragDropBefore = false;
    }
  }

  return false;
}

export async function tabDrop(e) {
  e.stopPropagation();

  if (!dragTabs.includes(dragOverTab)) {
    const toTabId = Number(dragOverTab.getAttribute('tabId'));
    const groupId = await getGroupId(toTabId);

    browser.tabs.onMoved.removeListener(tabMoved);
    // before: each tab goes before the target, keeping order.
    // after: each tab goes after the previously placed one.
    await dragTabs.reduce(async (prev, node) => {
      const anchor = await prev;
      anchor.insertAdjacentElement(dragDropBefore ? 'beforebegin' : 'afterend', node);
      const tabId = Number(node.getAttribute('tabId'));
      setGroupId(tabId, groupId);
      await moveTabNextTo(tabId, Number(anchor.getAttribute('tabId')), dragDropBefore);
      return dragDropBefore ? anchor : node;
    }, Promise.resolve(dragOverTab));
    browser.tabs.onMoved.addListener(tabMoved);

    groups.forEach((group) => {
      updateGroupFit(group);
    });
    clearMultiSelection();
  }

  return false;
}

export function groupDragOver(e) {
  e.preventDefault(); // Necessary. Allows us to drop.
  e.dataTransfer.dropEffect = 'move'; // See the section on the DataTransfer object.

  return false;
}

async function putTabInGroup(groupId) {
  const tabIds = dragTabs.map((node) => {
    groupNodes[groupId].newtab.insertAdjacentElement('beforebegin', node);
    const tabId = Number(node.getAttribute('tabId'));
    setGroupId(tabId, groupId);
    return tabId;
  });
  clearMultiSelection();

  groups.forEach((group) => {
    updateGroupFit(group);
  });

  browser.tabs.onMoved.removeListener(tabMoved);
  await browser.tabs.move(tabIds, { index: -1 });
  browser.tabs.onMoved.addListener(tabMoved);
}

// create new group if tab dropped outside existing group
export async function outsideDrop(e) {
  e.stopPropagation();

  const group = await groups.create();
  makeGroupNode(group);

  group.rect.w = 150 / window.innerWidth;
  group.rect.h = 150 / window.innerHeight;
  // clamp so drops near the edge (e.g. on the new group overlay) stay on screen
  group.rect.x = Math.min((e.clientX - 75) / window.innerWidth, 1 - group.rect.w);
  group.rect.y = Math.min((e.clientY - 75) / window.innerHeight, 1 - group.rect.h);

  const groupElement = groupNodes[group.id].group;

  document.getElementById('groups').appendChild(groupElement);

  if (document.body.classList.contains('tiling')) {
    activateTiling();
  } else {
    resizeGroups();
  }

  putTabInGroup(group.id);

  groupElement.scrollIntoView({ behavior: 'smooth' });

  return false;
}

export async function groupDrop(e) {
  e.stopPropagation();

  const groupId = Number(this.getAttribute('groupId'));

  putTabInGroup(groupId);

  return false;
}

export function tabDragEnd() {
  dragCount = 0;
  dragTabs.forEach((t) => t.classList.remove('drag'));
  dragIndicator.classList.remove('show');
  newGroupDrop.classList.remove('show', 'over');
}

// Drop target for creating a new group; needed when tiling leaves no empty space
export function createNewGroupDrop() {
  newGroupDrop = newElement('div', { id: 'newGroupDrop', content: browser.i18n.getMessage('createNewGroup') });
  newGroupDrop.addEventListener('dragover', groupDragOver, false);
  newGroupDrop.addEventListener('drop', outsideDrop, false);
  // :hover doesn't apply during drag, toggle a class instead
  newGroupDrop.addEventListener('dragenter', () => newGroupDrop.classList.add('over'));
  newGroupDrop.addEventListener('dragleave', () => newGroupDrop.classList.remove('over'));
  return newGroupDrop;
}
