import assert from 'node:assert';
import { matchDomainRule } from '../src/js/_share/utils.js'; // eslint-disable-line import/extensions

const rules = [
  { pattern: '*.reddit.com', group: 'reddit' },
  { pattern: ' github.com ', group: ' Code ' },
  { pattern: 'half.com', group: '' },
];
assert.equal(matchDomainRule(rules, 'www.reddit.com'), 'reddit');
assert.equal(matchDomainRule(rules, 'reddit.com'), 'reddit');
assert.equal(matchDomainRule(rules, 'notreddit.com'), undefined);
assert.equal(matchDomainRule(rules, 'github.com'), 'Code');
assert.equal(matchDomainRule(rules, 'gist.github.com'), undefined);
assert.equal(matchDomainRule(rules, 'half.com'), undefined);
assert.equal(matchDomainRule([], 'reddit.com'), undefined);
