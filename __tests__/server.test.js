const request = require('supertest');
const app = require('../server');

describe('Server', () => {
  it('serves the home page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('AI Study Helper');
  });

  it('summarizes text and stores it', async () => {
    const res = await request(app)
      .post('/api/summarize')
      .send({ text: 'This is a test document with multiple words to summarize.' });
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();

    const list = await request(app).get('/api/summaries');
    expect(list.body.summaries.length).toBeGreaterThan(0);
  });

  it('renders a summary detail page', async () => {
    const res = await request(app)
      .post('/api/summarize')
      .send({ text: 'Another test document to view detail page.' });
    const id = res.body.id;
    const page = await request(app).get(`/summaries/${id}`);
    expect(page.status).toBe(200);
    expect(page.text).toContain('Summary Detail');
    expect(page.text).toContain('Another test document');
  });
});
