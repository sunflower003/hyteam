// End-to-end test for chat scenarios
import puppeteer from 'puppeteer';

describe('Chat Scenarios', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should handle a user chat session', async () => {
    await page.goto('http://localhost:3000');
    await page.type('#chat-input', 'Hello');
    await page.click('#send-button');
    const response = await page.$eval('#chat-response', el => el.textContent);
    expect(response).toBe('Response to: Hello');
  });
});
