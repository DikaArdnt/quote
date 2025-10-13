import { Hono } from 'hono';
import { marked } from 'marked';
import { poweredBy } from 'hono/powered-by';
import { prettyJSON } from 'hono/pretty-json';
import { serveStatic } from 'hono/serve-static';
import getClientIP from './utils/getClientIp.js';
import Quote from './core/index.js';

const app = new Hono();

app.use(
	serveStatic({
		root: './public',
		getContent: async (file, c) => {
			const res = Bun.file(file);
			if (await res.exists()) {
				const data = await res.arrayBuffer();
				const mime = res.type;

				return c.body(data, 200, { 'Content-Type': mime });
			}
		},
	})
);
app.use(async (c, next) => {
	var colorStatus = status => {
		switch ((status / 100) | 0) {
			case 5:
				return `\x1B[31m${status}\x1B[0m`;
			case 4:
				return `\x1B[33m${status}\x1B[0m`;
			case 3:
				return `\x1B[36m${status}\x1B[0m`;
			case 2:
				return `\x1B[32m${status}\x1B[0m`;
		}
		return `${status}`;
	};

	const start = Date.now();
	const ipClient = getClientIP(c);

	await next();

	console.log(`${ipClient} ${c.req.method} ${c.req.path + new URL(c.req.url).search} ${colorStatus(c.res.status)} ${Date.now() - start}ms`);
});
app.use(poweredBy({ serverName: 'Hisoka Labs' }));
app.use(prettyJSON({ space: 3 }));

app.get('/', async c => {
	const res = Bun.file('README.md');
	const text = await res.text();
	const html = marked(text);

	return c.html(`<html>
      <head>
        	<title>Quote API Documentation</title>
			<meta name="viewport" content="width=device-width, initial-scale=1">
		  	<meta charset="utf-8">
		  	<meta name="description" content="An Quote API Telegram fast, simple, and free.">
			<meta name="keywords" content="quote api, telegram quote api, quote maker, quote generator, hisoka labs, kualat">
			<meta name="author" content="Hisoka Labs">
        	<link rel="stylesheet" href="/styles.css">
			<link rel="icon" type="image/png" href="/favicon.png">
		  	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css">
			<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
		</head>
      <body>
        	${html}
			<script>hljs.highlightAll();</script>
      </body>
   </html>`);
});

app.post('/', async c => {
	try {
		const body = c.req.header('Content-Type') === 'application/json' ? await c.req.json() : await c.req.parseBody();

		// body validation
		if (!body.messages) return c.json({ status: false, message: 'messages is required' }, 400);
		if (!Array.isArray(body.messages)) return c.json({ status: false, message: 'messages must be an array' }, 400);
		if (typeof body.messages[0] !== 'object') return c.json({ status: false, message: 'messages must be an array of objects' }, 400);

		const data = await Quote(body);

		return c.json(data);
	} catch (e) {
		console.error(e);
		return c.json({ status: false, message: 'Invalid JSON' }, 400);
	}
});

export default {
	port: process.env.PORT || 3000,
	fetch: app.fetch,
};
