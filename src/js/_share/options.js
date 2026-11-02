export const defaultOptions = (() => {
  const majorVersion = parseInt(browser.runtime.getManifest().version, 10);
  let options = {
    toolbarPosition: 'top',
    autoArrange: true,
    domainRules: [], // [{ pattern, group }]
    shortcut: {
      'activate-next-group': {
        disabled: false,
      },
      'activate-previous-group': {
        disabled: false,
      },
    },
  };

  if (majorVersion >= 1) {
    options = Object.assign(options, {
      theme: 'dark',
    });
  } else {
    options = Object.assign(options, {
      theme: 'light',
    });
  }

  return options;
})();

/**
 * Return the current state of the options
 * @return {object} options
 */
export async function loadOptions() {
  const options = await browser.storage.sync.get(defaultOptions);

  return options;
}

export const currentOptions = loadOptions();
