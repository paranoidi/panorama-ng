import assert from 'node:assert';
import { matchDomainRule } from '../src/js/_share/utils.js'; // eslint-disable-line import/extensions

const rules = [
  { pattern: '*.reddit.com', group: 'reddit' },
  { pattern: ' github.com ', group: ' Code ' },
  { pattern: 'half.com', group: '' },
  { pattern: '192.168.*', group: 'lan' },
  { pattern: '*.example.*', group: 'ex' },
];
assert.equal(matchDomainRule(rules, 'www.reddit.com'), 'reddit');
assert.equal(matchDomainRule(rules, 'reddit.com'), 'reddit');
assert.equal(matchDomainRule(rules, 'notreddit.com'), undefined);
assert.equal(matchDomainRule(rules, 'github.com'), 'Code');
assert.equal(matchDomainRule(rules, 'gist.github.com'), undefined);
assert.equal(matchDomainRule(rules, 'half.com'), undefined);
assert.equal(matchDomainRule([], 'reddit.com'), undefined);
assert.equal(matchDomainRule(rules, '192.168.1.10'), 'lan');
assert.equal(matchDomainRule(rules, '10.192.168.1'), undefined);
assert.equal(matchDomainRule(rules, '192x168.1.1'), undefined);
assert.equal(matchDomainRule(rules, 'www.example.org'), 'ex');
