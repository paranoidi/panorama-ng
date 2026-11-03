# Panorama NG

Panorama NG is a fork of [Panorama Tab Groups](https://github.com/projectdelphai/panorama-tab-groups).

## New features

Compared to the last upstream Panorama Tab Groups release:

- **Domain rules** – the ⇢ toolbar button opens a rule editor that maps domains to groups. Tabs opening a matching domain move to that group automatically, and the group is created if missing. Patterns support wildcards anywhere (`*.reddit.com`, `192.168.*`, `*.example.*`); `*.example.com` also matches `example.com`. Saving rules re-sorts already open tabs.
- **Multi-tab selection** – Ctrl/Cmd+click selects several tabs; dragging one of them moves them all.
- **"Create new group" drop target** – while dragging tabs, a drop zone appears in the bottom-right corner, so a new group can be made even when tiling leaves no free space.
- **Tiling lock** – the grid toolbar button turns on automatic tiling (blue = on): groups are arranged automatically, new groups included, and locked in place. Free-form layout unlocks them.
- **Escape cancels a group rename.**

## Other improvements

- The view remembers each window's layout mode (free-form or tiling) instead of always opening in free-form.
- Faster view opening: favicons and thumbnails no longer block rendering (suspended tabs used to stall it).
- Tabs are sized correctly on first render.
- Tabs without a group at startup are assigned to one instead of ending up hidden.
- Dropping a tab after another tab puts it in the right browser position.
- Toolbar icons are readable in dark mode.
- The popup view was removed; the toolbar button always opens the full view.
- Release notes after an update open this project's releases page.
- All dependencies have been updated.

## Description

Panorama Tab Groups is an easy way to organize a lot of tabs. You can visually group related tabs and switch between groups.

<img src="readme/images/readme-view-freeform.png" alt="" />

Panorama Tab Groups is an updated and maintained fork of [Panorama View](https://github.com/photodiode/panorama-view) which is an implementation of the old [Panorama/Tab Groups add-on](https://addons.mozilla.org/en-US/firefox/addon/tab-groups-panorama/) which was deprecated with the new Firefox web extension system.

## Installation

Original Panorama Tab Groups is available as a Firefox Add-on [here](https://addons.mozilla.org/en-US/firefox/addon/panorama-tab-groups/). Just follow the link, click "Add to Firefox", and you're good to go.

Panorama NG will be published once local testing phase is completed.

## Usage

The default shortcut to switch to panorama view is Ctrl+Alt+P and you can to the next or previous tab group with Alt+W/Alt+Shift+W. Any of these shortcuts can be changed in the add-on preferences tab.

## Contribution

Contributions of all kind are welcome. For example:

- Bug reports and fixes
- Feature requests and solutions
- Translations corrections and additions

For more details look into the [contribution instructions](CONTRIBUTION.md).
