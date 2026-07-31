// Minimal browser test framework
const results = { pass: 0, fail: 0, errors: [] };
let currentSuite = '';

export function describe(name, fn) {
  currentSuite = name;
  fn();
  currentSuite = '';
}

export function it(name, fn) {
  const label = currentSuite ? `${currentSuite} > ${name}` : name;
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => { results.pass++; log(label, true); })
        .catch(err => { results.fail++; results.errors.push({ label, err }); log(label, false, err); });
    }
    results.pass++;
    log(label, true);
  } catch (err) {
    results.fail++;
    results.errors.push({ label, err });
    log(label, false, err);
  }
}

export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(expected) {
      const a = JSON.stringify(actual), b = JSON.stringify(expected);
      if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
    },
    toContain(sub) {
      if (typeof actual === 'string') {
        if (!actual.includes(sub)) throw new Error(`Expected string to contain "${sub}", got "${actual.slice(0, 100)}"`);
      } else if (Array.isArray(actual)) {
        if (!actual.includes(sub)) throw new Error(`Expected array to contain ${JSON.stringify(sub)}`);
      } else throw new Error('toContain requires string or array');
    },
    toMatch(regex) {
      if (!regex.test(actual)) throw new Error(`Expected "${actual}" to match ${regex}`);
    },
    toBeGreaterThan(n) {
      if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeLessThan(n) {
      if (!(actual < n)) throw new Error(`Expected ${actual} < ${n}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
    },
    toThrow(msgMatch) {
      if (typeof actual !== 'function') throw new Error('toThrow requires a function');
      try { actual(); throw new Error('Expected function to throw'); }
      catch (e) {
        if (e.message === 'Expected function to throw') throw e;
        if (msgMatch && !e.message.includes(msgMatch)) throw new Error(`Expected throw containing "${msgMatch}", got "${e.message}"`);
      }
    },
    async toReject(msgMatch) {
      if (typeof actual !== 'function') throw new Error('toReject requires an async function');
      try { await actual(); throw new Error('Expected promise to reject'); }
      catch (e) {
        if (e.message === 'Expected promise to reject') throw e;
        if (msgMatch && !e.message.includes(msgMatch)) throw new Error(`Expected rejection containing "${msgMatch}", got "${e.message}"`);
      }
    },
    toBeInstanceOf(cls) {
      if (!(actual instanceof cls)) throw new Error(`Expected instance of ${cls.name}`);
    },
    toHaveLength(n) {
      if (actual.length !== n) throw new Error(`Expected length ${n}, got ${actual.length}`);
    },
  };
}

function log(label, passed, err) {
  const el = document.createElement('div');
  el.className = passed ? 'test-pass' : 'test-fail';
  el.textContent = `${passed ? '✓' : '✗'} ${label}`;
  if (err) {
    const detail = document.createElement('pre');
    detail.textContent = err.message || String(err);
    el.appendChild(detail);
  }
  document.getElementById('results').appendChild(el);
}

export function summary() {
  const el = document.createElement('div');
  el.className = 'test-summary';
  el.textContent = `${results.pass + results.fail} tests: ${results.pass} passed, ${results.fail} failed`;
  document.getElementById('results').prepend(el);
  document.title = results.fail ? `FAIL (${results.fail})` : `PASS (${results.pass})`;
  return results;
}

export async function runAll(suites) {
  for (const suite of suites) {
    await suite();
  }
  return summary();
}
