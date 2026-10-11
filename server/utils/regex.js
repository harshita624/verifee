// Escape user input before it is placed inside a RegExp (prevents regex
// injection / ReDoS such as "(a+)+$").
const escapeRegex = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { escapeRegex };