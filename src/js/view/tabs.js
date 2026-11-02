export async function setGroupId(tabId, groupId) {
  await browser.sessions.setTabValue(tabId, 'groupId', parseInt(groupId, 10));
}

export async function getGroupId(tabId) {
  return browser.sessions.getTabValue(tabId, 'groupId');
}

export async function getAllTabsInWindow() {
  return browser.tabs.query({ currentWindow: true });
}

export async function forEachTab(callback) {
  const tabs = await getAllTabsInWindow();
  // wait for every callback; callers rely on the work being done when this resolves
  await Promise.all(tabs.map((tab) => callback(tab)));
}

export async function forEachTabSync(callback) {
  const tabs = await getAllTabsInWindow();
  tabs.forEach((tab) => {
    callback(tab);
  });
}
