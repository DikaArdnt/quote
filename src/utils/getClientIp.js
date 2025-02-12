'use strict';
import { getConnInfo } from 'hono/bun';

export var regexes = {
	ipv4: /^(?:(?:\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.){3}(?:\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])$/,
	ipv6: /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i,
};

export function isIpInCidr(ip, cidr) {
	// Split IP and CIDR into parts
	const [cidrIp, cidrBits] = cidr.split('/');
	const mask = ~((1 << (32 - +cidrBits)) - 1) >>> 0;

	// Convert IP addresses to numeric values
	const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
	const cidrIpNum = cidrIp.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;

	// Compare using bitwise operations
	return (ipNum & mask) === (cidrIpNum & mask);
}

function existy(value) {
	return value != null;
}

function ip(value) {
	return (existy(value) && regexes.ipv4.test(value)) || regexes.ipv6.test(value);
}

function getClientIpFromXForwardedFor(value) {
	if (!existy(value)) {
		return null;
	}

	if (typeof value !== 'string') {
		throw new TypeError('Expected a string, got "'.concat(typeof value, '"'));
	}

	var forwardedIps = value.split(',').map(function (e) {
		var ip = e.trim();

		if (ip.includes(':')) {
			var splitted = ip.split(':');

			if (splitted.length === 2) {
				return splitted[0];
			}
		}

		return ip;
	});

	for (var i = 0; i < forwardedIps.length; i++) {
		if (ip(forwardedIps[i])) {
			return forwardedIps[i];
		}
	}

	return null;
}

/**
 *
 * @param {import('hono').Context} c
 * @returns
 */
function getClientIp(c) {
	// Get request headers
	const headers = c.req.raw.headers;
	const { remote } = getConnInfo(c)

	// Check headers
	if (headers) {
		if (ip(headers.get('cf-connecting-ip'))) {
			return headers.get('cf-connecting-ip');
		}

		if (ip(headers.get('cf-pseudo-ipv4'))) {
			return headers.get('cf-pseudo-ipv4');
		}

		if (ip(headers.get('x-client-ip'))) {
			return headers.get('x-client-ip');
		}

		const xForwardedFor = getClientIpFromXForwardedFor(headers.get('x-forwarded-for'));
		if (ip(xForwardedFor)) {
			return xForwardedFor;
		}

		if (ip(headers.get('fastly-client-ip'))) {
			return headers.get('fastly-client-ip');
		}

		if (ip(headers.get('true-client-ip'))) {
			return headers.get('true-client-ip');
		}

		if (ip(headers.get('x-real-ip'))) {
			return headers.get('x-real-ip');
		}

		if (ip(headers.get('x-cluster-client-ip'))) {
			return headers.get('x-cluster-client-ip');
		}

		if (ip(headers.get('x-forwarded'))) {
			return headers.get('x-forwarded');
		}

		if (ip(headers.get('forwarded-for'))) {
			return headers.get('forwarded-for');
		}

		if (ip(headers.get('forwarded'))) {
			return headers.get('forwarded');
		}

		if (ip(headers.get('x-appengine-user-ip'))) {
			return headers.get('x-appengine-user-ip');
		}
	}

	// Check direct IP from Hono's request
	if (ip(remote.address)) {
		return remote.address.replaceAll(/:|ffff/g, '');
	}

	return null;
}

function mw(options) {
	var configuration = typeof options !== 'object' ? {} : options;

	if (typeof configuration !== 'object') {
		throw new TypeError('Options must be an object!');
	}

	var attributeName = configuration.attributeName || 'clientIp';
	return function (req, res, next) {
		var ip = getClientIp(req);
		Object.defineProperty(req, attributeName, {
			get: function get() {
				return ip;
			},
			configurable: true,
		});
		next();
	};
}

export default getClientIp;
export { getClientIpFromXForwardedFor, getClientIp, mw, ip };
