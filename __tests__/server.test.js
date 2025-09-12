const request = require('supertest');
jest.mock('../db', () => {
  const actual = jest.requireActual('../db');
  return { ...actual, insertSummary: jest.fn(actual.insertSummary) };
});
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: async () => ([]), text: async () => '' })
);
const app = require('../server');
const db = require('../db');
const realDb = jest.requireActual('../db');

describe('Server', () => {
  const agent = request.agent(app);

  beforeAll(async () => {
    await agent.post('/signup').send({ username: 'user1', password: 'pass1' });
    await agent.post('/login').send({ username: 'user1', password: 'pass1' });
  });

  it('serves the home page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('AI Study Helper');
  });

  it('returns current user info', async () => {
    const res = await agent.get('/me');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('user1');

    const unauthorized = await request(app).get('/me');
    expect(unauthorized.status).toBe(401);
  });

  it('rejects requests without authentication', async () => {
    const res = await request(app)
      .post('/api/summarize')
      .send({ text: 'test' });
    expect(res.status).toBe(401);
  });

  it('summarizes text and stores it for the logged in user', async () => {
    const res = await agent
      .post('/api/summarize')
      .send({ text: 'This is a test document with multiple words to summarize.' });
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();

    const list = await agent.get('/api/summaries');
    expect(list.body.summaries.length).toBeGreaterThan(0);
  });

  it('renders a summary detail page for the logged in user', async () => {
    const res = await agent
      .post('/api/summarize')
      .send({ text: 'Another test document to view detail page.' });
    const id = res.body.id;
    const page = await agent.get(`/summaries/${id}`);
    expect(page.status).toBe(200);
    expect(page.text).toContain('Summary Detail');
    expect(page.text).toContain('Another test document');
  });

  it('allows a user to delete a summary', async () => {
    const created = await agent
      .post('/api/summarize')
      .send({ text: 'Summary to delete.' });
    const id = created.body.id;
    const del = await agent.delete(`/api/summaries/${id}`);
    expect(del.status).toBe(200);
    const list = await agent.get('/api/summaries');
    const ids = list.body.summaries.map((s) => s.id);
    expect(ids).not.toContain(id);
  });

  it('returns 400 if text is missing', async () => {
    const res = await agent.post('/api/summarize').send({});
    expect(res.status).toBe(400);
  });

  it('handles database errors when saving summaries', async () => {
    db.insertSummary.mockImplementation((userId, text, summary, cb) =>
      cb(new Error('fail'))
    );
    const res = await agent
      .post('/api/summarize')
      .send({ text: 'trigger db error' });
    expect(res.status).toBe(500);
    db.insertSummary.mockImplementation(realDb.insertSummary);
  });

  it('returns 404 for invalid summary id', async () => {
    const res = await agent.get('/summaries/999999');
    expect(res.status).toBe(404);
  });

  it('isolates summaries per user', async () => {
    const agent2 = request.agent(app);
    await agent2.post('/signup').send({ username: 'user2', password: 'pass2' });
    await agent2.post('/login').send({ username: 'user2', password: 'pass2' });
    const list = await agent2.get('/api/summaries');
    expect(list.body.summaries.length).toBe(0);
    await new Promise((resolve) => agent2.app.close(resolve));
  });

  it('answers questions about a summary', async () => {
    const created = await agent
      .post('/api/summarize')
      .send({ text: 'Paris is the capital of France.' });
    const id = created.body.id;
    const qa = await agent
      .post('/api/ask')
      .send({ id, question: 'What is the capital of France?' });
    expect(qa.status).toBe(200);
    expect(qa.body.answer.toLowerCase()).toContain('paris');
  });

  it('generates flashcards from a summary', async () => {
    const created = await agent
      .post('/api/summarize')
      .send({ text: 'Paris is the capital of France.' });
    const id = created.body.id;
    const fc = await agent.post('/api/flashcards').send({ id });
    expect(fc.status).toBe(200);
    expect(Array.isArray(fc.body.flashcards)).toBe(true);
    expect(fc.body.flashcards.length).toBeGreaterThan(0);
    const answers = fc.body.flashcards.map((c) => c.answer.toLowerCase()).join(' ');
    expect(answers).toContain('paris');
  });

  it('records ad impressions and filters by feature', async () => {
    const baseTotal = await agent.get('/api/ads/impressions');
    const baseTest = await agent.get('/api/ads/impressions?feature=test');
    const baseOther = await agent.get('/api/ads/impressions?feature=other');

    await agent.post('/api/ads/impression').send({ feature: 'test' });
    await agent.post('/api/ads/impression').send({ feature: 'other' });
    await agent.post('/api/ads/impression').send({ feature: 'test' });

    const total = await agent.get('/api/ads/impressions');
    expect(total.status).toBe(200);
    expect(total.body.count).toBe(baseTotal.body.count + 3);

    const testCount = await agent.get('/api/ads/impressions?feature=test');
    expect(testCount.status).toBe(200);
    expect(testCount.body.count).toBe(baseTest.body.count + 2);

    const otherCount = await agent.get('/api/ads/impressions?feature=other');
    expect(otherCount.status).toBe(200);
    expect(otherCount.body.count).toBe(baseOther.body.count + 1);
  });

  afterAll((done) => {
    agent.app.close(() => db.close(done));
  });
});

