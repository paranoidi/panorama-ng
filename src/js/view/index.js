import { getGroupId } from './tabs.js';
import {
  tabMoved, groupDragOver, outsideDrop, createDragIndicator, createNewGroupDrop,
} from './drag.js';
import {
  groupNodes, initGroupNodes, closeGroup, makeGroupNode,
  fillGroupNodes, insertTab, resizeGroups, raiseGroup, updateGroupFit, activateTiling,
} from './groupNodes.js';
import {
  initTabNodes, makeTabNode, updateTabNode, setActiveTabNode,
  setActiveTabNodeById, getActiveTabId, deleteTabNode, updateThumbnail, updateFavicon,
} from './tabNodes.js';
import * as groups from './groups.js';
import { loadOptions } from '../_share/options.js';
import { newElement } from '../_share/utils.js';

const view = {
  windowId: -1,
  tabId: -1,
  groupsNode: null,
  dragIndicator: null,
  // intervalId: null,
  tabs: {},
};

let pendingReload = false;

function queueReload() {
  if (document.hidden) {
    pendingReload = true;
  } else {
    window.location.reload();
  }
}

// Tiling functionality
// Toggle tiling on or off
async function setLayoutMode(mode) {
  const windowId = (await browser.windows.getCurrent()).id;

  if (mode === 'tiling') {
    await browser.sessions.setWindowValue(windowId, 'layoutMode', 'tiling');
    activateTiling();
  } else {
    await browser.sessions.setWindowValue(windowId, 'layoutMode', 'freeform');
    resizeGroups();
  }
}

async function captureThumbnail(tab) {
  const tabId = tab.id;

  const cachedThumbnail = await browser.sessions.getTabValue(tabId, 'thumbnail');

  // Only capture a new thumbnail if there's no cached one,
  // the cached one doesn't have a capturedTime,
  // or the tab was accessed since the cache was made
  if (!cachedThumbnail || !cachedThumbnail.capturedTime
    || cachedThumbnail.capturedTime < tab.lastAccessed) {
    const data = await browser.tabs.captureTab(tabId, { format: 'jpeg', quality: 25 });
    const img = new Image();

    img.onload = async function f() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = 500;
      canvas.height = canvas.width * (this.height / this.width);

      // ctx.imageSmoothingEnabled = true;
      // ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this, 0, 0, canvas.width, canvas.height);

      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

      updateThumbnail(tabId, thumbnail);
      browser.sessions.setTabValue(tabId, 'thumbnail', {
        thumbnail,
        capturedTime: Date.now(),
      });
    };

    img.src = data;
  }
}

async function captureThumbnails() {
  const tabs = await browser.tabs.query({ currentWindow: true, discarded: false });

  tabs.forEach(async (tab) => {
    await captureThumbnail(tab); // await to lessen strain on browser
  });
}

async function createGroup(x = 75, y = 75) {
  const group = await groups.create();

  group.rect.x = (x - 75) / window.innerWidth;
  group.rect.y = (y - 75) / window.innerHeight;
  group.rect.w = 150 / window.innerWidth;
  group.rect.h = 150 / window.innerHeight;

  const groupElement = makeGroupNode(group);

  view.groupsNode.appendChild(groupElement);

  if ((await loadOptions()).autoArrange) {
    activateTiling();
  } else {
    resizeGroups();
  }

  groupElement.scrollIntoView({ behavior: 'smooth' });
}

/*
 * Search through tabs based on input field
 */
async function searchTabs() {
  const tabs = await browser.tabs.query({ currentWindow: true });
  const searchInput = document.getElementById('tab-search').value;
  // get old active tab in case search doesn't find any valid tabs
  let futureActiveTabId = getActiveTabId();
  tabs.forEach((tab, tabIndex) => {
    const { title } = tabs[tabIndex];
    // lowercase both inputs and compare to see if match
    if (title.toLowerCase().includes(searchInput.toLowerCase())) {
      futureActiveTabId = tabs[tabIndex].id;
    }
  });
  setActiveTabNodeById(futureActiveTabId);
}

async function keyInput(e) {
  if (e.key === 'ArrowRight') {
    const activeTabId = getActiveTabId();
    let groupId = await getGroupId(activeTabId);
    let { childNodes } = groupNodes[groupId].content;

    let i;
    let tabId;
    for (i = 0; i < childNodes.length; i += 1) {
      tabId = Number(childNodes[i].getAttribute('tabId'));
      if (tabId === activeTabId) {
        break;
      }
    }

    let newTabId = -1;
    const max = childNodes.length - 2;
    // check if at end or if tab not found
    if (i === max || i === childNodes.length) {
      const groupsLength = Object.keys(groupNodes).length;

      const last = Object.keys(groupNodes)[groupsLength - 2];
      if (groupId === last) {
        const first = Object.keys(groupNodes)[0];
        groupId = first;
      } else {
        const index = Object.keys(groupNodes).indexOf(groupId.toString());
        groupId = Object.keys(groupNodes)[index + 1];
      }
      childNodes = groupNodes[groupId].content.childNodes;
      newTabId = Number(childNodes[0].getAttribute('tabId'));
    } else {
      newTabId = Number(childNodes[i + 1].getAttribute('tabId'));
    }

    setActiveTabNodeById(newTabId);
  } else if (e.key === 'ArrowLeft') {
    const activeTabId = getActiveTabId();
    let groupId = await getGroupId(activeTabId);
    let { childNodes } = groupNodes[groupId].content;

    let i;
    for (i = 0; i < childNodes.length; i += 1) {
      const tabId = Number(childNodes[i].getAttribute('tabId'));
      if (tabId === activeTabId) {
        break;
      }
    }

    let newTabId = -1;
    // check if at end or if tab not found
    if (i === 0 || i === childNodes.length) {
      const groupsLength = Object.keys(groupNodes).length;

      // check if at last tab in group and switch to next group
      const first = Object.keys(groupNodes)[0];
      if (groupId === first) {
        groupId = Object.keys(groupNodes)[groupsLength - 2];
      } else {
        const index = Object.keys(groupNodes).indexOf(groupId.toString());
        groupId = Object.keys(groupNodes)[index - 1];
      }
      childNodes = groupNodes[groupId].content.childNodes;
      const childNodesSize = Object.keys(childNodes).length - 2;
      newTabId = Number(childNodes[childNodesSize].getAttribute('tabId'));
    } else {
      newTabId = Number(childNodes[i - 1].getAttribute('tabId'));
    }

    setActiveTabNodeById(newTabId);
  } else if (e.key === 'Enter') {
    browser.tabs.update(getActiveTabId(), { active: true });
  }
}

async function tabCreated(tab) {
  if (view.windowId === tab.windowId) {
    makeTabNode(tab);
    updateTabNode(tab);
    updateFavicon(tab);

    // Wait for background script to assign this tab to a group
    const groupId = await getGroupId(tab.id);

    const group = groups.get(groupId);
    await insertTab(tab);
    updateGroupFit(group);
  }
}

function tabRemoved(tabId, removeInfo) {
  if (view.windowId === removeInfo.windowId && view.tabId !== tabId) {
    deleteTabNode(tabId);
    groups.forEach((group) => {
      updateGroupFit(group);
    });
  }
}

async function tabUpdated(tabId, changeInfo, tab) {
  updateTabNode(tab);
  updateFavicon(tab);

  if ('pinned' in changeInfo) {
    // FIXME for some reason the pinned tabs aren't updating reliably.
    // putting a temporary reload trigger in until someone can figure out why that's happening
    queueReload();

    fillGroupNodes();
    updateTabNode(tab);
  }
}

async function tabAttached(tabId, attachInfo) {
  if (view.windowId === attachInfo.newWindowId) {
    const tab = await browser.tabs.get(tabId);
    tabCreated(tab);
  }
}

function tabDetached(tabId, detachInfo) {
  if (view.windowId === detachInfo.oldWindowId) {
    console.log('delete node', tabId);
    deleteTabNode(tabId); // something really weird is happening here...
    groups.forEach((group) => {
      updateGroupFit(group);
    });
  }
}

async function doubleClick(e) {
  if (e.target.className === 'content transition') {
    const groupID = e.target.getAttribute('groupid');
    const group = groups.get(groupID);
    closeGroup(e.target, group);
  } else if (e.target.id === 'groups') {
    createGroup(e.clientX, e.clientY);
  }
}

async function singleClick(e) {
  if (e.target.className === 'content transition') {
    const groupID = parseInt(e.target.getAttribute('groupid'), 10);
    raiseGroup(groupID);
  }
  e.stopPropagation();
}

/**
 * Initialize the Panorama View tab
 *
 * This displays all the groups and the tabs in them, and sets up listeners
 * to respond to user actions and react to changes
 */
async function initView() {
  // set locale specific titles
  document.getElementById('newGroup').title = browser.i18n.getMessage('newGroupButton');
  document.getElementById('settings').title = browser.i18n.getMessage('settingsButton');
  document.getElementById('tiling').title = browser.i18n.getMessage('tilingButton');
  document.getElementById('freeform').title = browser.i18n.getMessage('freeformButton');

  view.windowId = (await browser.windows.getCurrent()).id;
  view.tabId = (await browser.tabs.getCurrent()).id;
  view.groupsNode = document.getElementById('groups');

  view.groupsNode.appendChild(createDragIndicator());
  document.body.appendChild(createNewGroupDrop());

  await groups.init();

  // init Nodes
  await initTabNodes(view.tabId);
  await initGroupNodes(view.groupsNode);

  // restore the window's saved layout (free-form if never chosen)
  const layoutMode = await browser.sessions.getWindowValue(view.windowId, 'layoutMode');
  // a domain rule created a group while the view was closed: auto-arrange like createGroup does
  const arrangePending = await browser.sessions.getWindowValue(view.windowId, 'arrangePending');
  if (arrangePending) await browser.sessions.removeWindowValue(view.windowId, 'arrangePending');

  if (layoutMode === 'tiling' || (arrangePending && (await loadOptions()).autoArrange)) {
    activateTiling();
  } else {
    resizeGroups();
  }

  captureThumbnails();
  // view.intervalId = setInterval(captureThumbnails, 2000);

  // set all listeners

  // Listen for clicks on new group button
  document.getElementById('newGroup').addEventListener('click', () => createGroup(), false);

  // Listen for clicks on settings button
  document.getElementById('settings').addEventListener('click', () => {
    browser.runtime.openOptionsPage();
  }, false);

  document.getElementById('freeform').addEventListener('click', () => {
    setLayoutMode('freeform');
    document.getElementById('autoArrange').classList.remove('on');
    browser.storage.sync.set({ autoArrange: false });
  }, false);

  // Listen for tiling toggle
  document.getElementById('tiling').addEventListener('click', () => {
    setLayoutMode('tiling');
  }, false);

  // Auto-arrange toggle; state is shown by the .on class (colour)
  const autoArrangeButton = document.getElementById('autoArrange');
  autoArrangeButton.title = browser.i18n.getMessage('autoArrangeButton');
  autoArrangeButton.classList.toggle('on', (await loadOptions()).autoArrange);
  autoArrangeButton.addEventListener('click', () => {
    const on = autoArrangeButton.classList.toggle('on');
    browser.storage.sync.set({ autoArrange: on });
    if (on) activateTiling();
  }, false);

  // Domain -> group rules editor
  const rulesDialog = document.getElementById('domainRulesDialog');
  const rulesBody = rulesDialog.querySelector('tbody');
  const i18n = (key) => browser.i18n.getMessage(key);
  document.getElementById('domainRulesButton').title = i18n('domainRulesButton');
  document.getElementById('domainRulesHelp').textContent = i18n('domainRulesHelp');
  rulesDialog.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = i18n(el.dataset.i18n); });

  // Row with pattern/group inputs and a Delete (or, for the trailing row, Add) button
  const ruleRow = ({ pattern = '', group = '' } = {}, isNew = false) => {
    const button = newElement('button', {
      type: 'button',
      class: isNew ? 'rule-add' : 'rule-delete',
      title: i18n(isNew ? 'domainRulesAdd' : 'domainRulesDelete'),
      content: isNew ? '＋' : '🗑',
    });
    const row = newElement('tr', {}, [
      newElement('td', {}, [newElement('input', { class: 'rule-pattern', placeholder: '*.reddit.com' })]),
      newElement('td', {}, [newElement('input', { class: 'rule-group', placeholder: 'reddit', list: 'domainRulesGroupNames' })]),
      newElement('td', {}, [button]),
    ]);
    row.querySelector('.rule-pattern').value = pattern;
    row.querySelector('.rule-group').value = group;
    button.addEventListener('click', () => {
      if (!isNew) {
        row.remove();
        return;
      }
      const [p, g] = row.querySelectorAll('input');
      if (!p.value.trim() || !g.value.trim()) return;
      row.before(ruleRow({ pattern: p.value, group: g.value }));
      p.value = '';
      g.value = '';
      p.focus();
    });
    return row;
  };

  document.getElementById('domainRulesButton').addEventListener('click', async () => {
    const { domainRules } = await loadOptions();
    rulesBody.replaceChildren(...domainRules.map((rule) => ruleRow(rule)), ruleRow({}, true));
    const groupNames = [];
    groups.forEach((group) => groupNames.push(newElement('option', { value: group.name })));
    document.getElementById('domainRulesGroupNames').replaceChildren(...groupNames);
    rulesDialog.showModal();
  }, false);
  rulesDialog.addEventListener('close', () => {
    if (rulesDialog.returnValue !== 'save') return;
    // the trailing "new" row is saved too if filled in
    const domainRules = [...rulesBody.rows]
      .map((row) => ({
        pattern: row.querySelector('.rule-pattern').value.trim(),
        group: row.querySelector('.rule-group').value.trim(),
      }))
      .filter((rule) => rule.pattern && rule.group);
    browser.storage.sync.set({ domainRules });
  });
  // keyInput's Enter handler would otherwise switch tabs while typing rules
  rulesDialog.addEventListener('keydown', (e) => e.stopPropagation());

  // Listen for search input
  document.getElementById('tab-search').addEventListener('input', searchTabs);

  // Listen for middle clicks in background to open new group
  document.getElementById('groups').addEventListener('auxclick', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.target !== document.getElementById('groups')) return; // ignore middle clicks in foreground
    if (event.button !== 1) return; // middle mouse

    createGroup(event.clientX, event.clientY);
  }, false);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (pendingReload) {
        window.location.reload();
      }

      setActiveTabNode(view.tabId);
      captureThumbnails();
    }
  }, false);

  window.addEventListener('resize', resizeGroups);
  document.addEventListener('keydown', keyInput);

  // Listen for tabs being added/removed/switched/etc. and update appropriately
  browser.tabs.onCreated.addListener(tabCreated);
  browser.tabs.onRemoved.addListener(tabRemoved);
  browser.tabs.onUpdated.addListener(tabUpdated, {
    // This page doesn't care about tabs in other windows
    windowId: view.windowId,
    // We don't want to listen for every property because that includes
    // the hidden state changing which generates a ton of events
    // every time the active group changes
    properties: [
      'discarded',
      'favIconUrl',
      'pinned',
      'title',
      'status',
    ],
  });
  browser.tabs.onMoved.addListener(tabMoved);
  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'groupsChanged') queueReload();
  });
  browser.tabs.onAttached.addListener(tabAttached);
  browser.tabs.onDetached.addListener(tabDetached);

  view.groupsNode.addEventListener('dragover', groupDragOver, false);
  view.groupsNode.addEventListener('drop', outsideDrop, false);
  view.groupsNode.addEventListener('dblclick', doubleClick, false);
  view.groupsNode.addEventListener('click', singleClick, false);
}

function replaceClass(prefix, value) {
  const { classList } = document.getElementsByTagName('body')[0];
  classList.forEach((classObject) => {
    if (classObject.startsWith(`${prefix}-`)) {
      classList.remove(classObject);
    }
  });
  classList.add(`${prefix}-${value}`);
}

function setTheme(theme) {
  replaceClass('theme', theme);
}

function setToolbarPosition(position) {
  replaceClass('toolbar', position);
}

// Load settings
browser.storage.sync.get({
  useDarkTheme: false,
  theme: 'light',
  toolbarPosition: 'top',
}).then((options) => {
  /*
     * Migrate legacy theme setting
     * @deprecate should be removed in v1.0.0
     */
  if (options.useDarkTheme) {
    options.theme = 'dark';
    browser.storage.sync.set({
      useDarkTheme: null,
      theme: 'dark',
    });
  }
  setTheme(options.theme);
  setToolbarPosition(options.toolbarPosition);

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if (changes.theme) {
        setTheme(changes.theme.newValue);
      }
      if (changes.toolbarPosition) {
        setToolbarPosition(changes.toolbarPosition.newValue);
      }
    }
  });

  initView();
});
