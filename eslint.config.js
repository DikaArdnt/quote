import globals from 'globals';
import pluginJs from '@eslint/js';

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.es2024,
				...globals.node,
				...globals.commonjs,
				...globals.prototypejs,
				Bun: false,
			},
		},
	},
	{
		rules: {
			...pluginJs.configs.recommended.rules,
			'no-prototype-builtins': 'off',
			'no-async-promise-executor': 'off',
		},
	},
	{
		ignores: ['node_modules', 'public/**'],
	},
];
