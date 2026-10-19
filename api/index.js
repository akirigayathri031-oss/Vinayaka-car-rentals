// Vercel entry point: every /api/* request is routed here (see vercel.json).
const { handle } = require('../server.js');
module.exports = (req, res) => handle(req, res);
