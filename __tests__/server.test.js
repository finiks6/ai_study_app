const request = require('supertest');
const app = require('../server');

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

  it('isolates summaries per user', async () => {
    const agent2 = request.agent(app);
    await agent2.post('/signup').send({ username: 'user2', password: 'pass2' });
    await agent2.post('/login').send({ username: 'user2', password: 'pass2' });
    const list = await agent2.get('/api/summaries');
    expect(list.body.summaries.length).toBe(0);
  });
});

