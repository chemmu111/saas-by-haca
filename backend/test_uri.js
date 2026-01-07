const process = { env: { NODE_ENV: 'production', API_URL: 'https://api.socialhac.com' } };

const isDev = process.env.NODE_ENV === 'development';
const baseUrl = isDev ? 'http://localhost:5001' : (process.env.API_URL || 'https://socialhac.com').replace(/\/$/, '').replace(/\/api.*$/, '');
const redirectUri = `${baseUrl}/api/oauth/callback/instagram`;

console.log('Base URL:', baseUrl);
console.log('Redirect URI:', redirectUri);

const process2 = { env: { NODE_ENV: 'production', API_URL: 'https://socialhac.com/api' } };
const baseUrl2 = (process2.env.API_URL || 'https://socialhac.com').replace(/\/$/, '').replace(/\/api.*$/, '');
const redirectUri2 = `${baseUrl2}/api/oauth/callback/instagram`;
console.log('Base URL 2:', baseUrl2);
console.log('Redirect URI 2:', redirectUri2);
