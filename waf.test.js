const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

const wafFactory = require('../src/middleware/waf');
const routes = require('../src/routes/index');

function buildApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use(wafFactory({ ipBlacklist: [], ipWhitelist: [] }));
  app.use('/', routes);
  return app;
}

describe('WAF middleware', () => {
  test('should allow normal request', async () => {
    const app = buildApp();
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  test('should block XSS-like payload', async () => {
    const app = buildApp();
    const res = await request(app).get('/').query({ q: '<script>alert(1)</script>' });
    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  test('should block SQLi-like payload in body', async () => {
    const app = buildApp();
    const res = await request(app).post('/auth/login').send({ username: "admin' OR '1'='1" });
    expect(res.statusCode).toBe(403);
  });
});
