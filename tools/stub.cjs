const f = () => f; module.exports = new Proxy(f, { get: (t, k) => k === '__esModule' ? false : f });
