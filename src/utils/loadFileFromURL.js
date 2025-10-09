import https from 'https';

export default (url, filter = false) => {
	return new Promise((resolve, reject) => {
		const options = new URL(url);
		options.headers = {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
		};

		https.get(options, res => {
			if (filter && filter(res.headers)) {
				resolve(Buffer.concat([]));
			}

			const chunks = [];

			res.on('error', err => {
				reject(err);
			});
			res.on('data', chunk => {
				chunks.push(chunk);
			});
			res.on('end', () => {
				resolve(Buffer.concat(chunks));
			});
		});
	});
};
