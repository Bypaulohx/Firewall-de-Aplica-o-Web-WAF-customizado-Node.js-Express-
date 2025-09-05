const ipRangeCheck = require('ip-range-check');
const logger = require('../utils/logger');
const config = require('../config');

const PATTERNS = {
  sql: /(\%27|\'|\-\-|\%23|#|\bOR\b|\bAND\b.*=)/i,
  xss: /(<script\b[^>]*>(.*?)<\/script>)|((%3C)(.*)(%3E))/i,
  pathTraversal: /(\.\.|%2e%2e|%2e\.|\.\/%2E)/i,
  suspiciousUserAgent: /(sqlmap|acunetix|nikto|fuzz|curl|python-requests|wget)/i
};

function inspectStrings(obj) {
  const reasons = [];
  if (!obj) return reasons;
  const s = JSON.stringify(obj);
  if (PATTERNS.sql.test(s)) reasons.push('sql-injection-like');
  if (PATTERNS.xss.test(s)) reasons.push('xss-like');
  if (PATTERNS.pathTraversal.test(s)) reasons.push('path-traversal-like');
  return reasons;
}

module.exports = function wafMiddleware(options = {}) {
  const ipBlacklist = options.ipBlacklist || config.ipBlacklist || [];
  const ipWhitelist = options.ipWhitelist || config.ipWhitelist || [];
  const maxBodySize = options.maxBodySize || config.maxBodySize;

  return function (req, res, next) {
    try {
      const remoteIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

      if (ipWhitelist.length && ipWhitelist.some(ip => ipRangeCheck(remoteIp, ip))) return next();
      if (ipBlacklist.length && ipBlacklist.some(ip => ipRangeCheck(remoteIp, ip))) {
        logger.warn(`Blocked IP ${remoteIp}`);
        return res.status(403).json({ error: 'Access denied (IP blacklisted)' });
      }

      const ua = req.get('user-agent') || '';
      if (PATTERNS.suspiciousUserAgent.test(ua)) {
        logger.warn(`Blocked suspicious UA: ${ua}`);
        return res.status(403).json({ error: 'Access denied (suspicious client)' });
      }

      const contentType = req.get('content-type') || '';
      if (req.method !== 'GET' && contentType && !/(application\/json|multipart\/form-data|application\/x-www-form-urlencoded)/i.test(contentType)) {
        logger.warn(`Blocked by content-type: ${contentType}`);
        return res.status(415).json({ error: 'Unsupported Media Type' });
      }

      const contentLength = Number(req.get('content-length') || 0);
      if (contentLength && contentLength > maxBodySize) {
        logger.warn(`Blocked due to large body: ${contentLength}`);
        return res.status(413).json({ error: 'Payload Too Large' });
      }

      const reasons = [...inspectStrings(req.query), ...inspectStrings(req.params), ...inspectStrings(req.body)];
      if (PATTERNS.pathTraversal.test(req.url)) reasons.push('path-traversal-in-url');

      if (reasons.length) {
        logger.warn(`Blocked request - ${reasons.join(', ')} - ${remoteIp}`);
        return res.status(403).json({ error: 'Access denied (WAF rule)', reasons });
      }

      next();
    } catch (err) {
      logger.error(`WAF error: ${err.message}`);
      return res.status(500).json({ error: 'WAF internal error' });
    }
  };
};
