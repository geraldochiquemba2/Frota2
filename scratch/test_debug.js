const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/debug/migrate',
  method: 'POST',
};

const req = http.request(options, (res) => {
  let d = '';
  res.on('data', (chunk) => { d += chunk; });
  res.on('end', () => { console.log(d); });
});

req.on('error', (e) => { console.error(e); });
req.end();
