import express, { json } from 'express';
import request from 'supertest';
import {
  installLenientPrmsCallbackJsonParser,
  isPrmsCallbackPath,
} from './lenient-callback-json';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-04 /
// NFR-PWH-005 carried gate 1. Falsifier: skip installLenient* and the
// callback `{` case becomes 400.

describe('isPrmsCallbackPath', () => {
  it('matches only the callback prefix', () => {
    expect(isPrmsCallbackPath('/api/prms-callback/segment')).toBe(true);
    expect(isPrmsCallbackPath('/api/prms-callback')).toBe(true);
    expect(isPrmsCallbackPath('/API/PRMS-CALLBACK/segment')).toBe(true);
    expect(isPrmsCallbackPath('/api/prms-callbacks/segment')).toBe(false);
    expect(isPrmsCallbackPath('/api/prms-webhook')).toBe(false);
    expect(isPrmsCallbackPath('/api/results/1')).toBe(false);
  });
});

describe('installLenientPrmsCallbackJsonParser', () => {
  const build = () => {
    const app = express();
    app.use(json());
    installLenientPrmsCallbackJsonParser(app);
    app.post('/api/prms-callback/:secret', (req, res) => {
      res.status(200).json({ body: req.body });
    });
    app.post('/api/prms-webhook', (req, res) => {
      res.status(200).json({ ok: true });
    });
    return app;
  };

  it('does not answer 400 for an unparseable callback body', async () => {
    const response = await request(build())
      .post('/api/prms-callback/placeholder')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(response.status).not.toBe(400);
    expect(response.status).toBe(200);
    expect(response.body.body).toEqual({ raw: '{' });
  });

  it('still answers 400 for an unparseable body on any other route', async () => {
    const response = await request(build())
      .post('/api/prms-webhook')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(response.status).toBe(400);
  });

  it('still parses a well-formed callback body', async () => {
    const response = await request(build())
      .post('/api/prms-callback/placeholder')
      .set('Content-Type', 'application/json')
      .send({ decision: 'NOPE' });

    expect(response.status).toBe(200);
    expect(response.body.body).toEqual({ decision: 'NOPE' });
  });
});
